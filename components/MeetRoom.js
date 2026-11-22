'use client';
import { useEffect, useRef, useState } from 'react';
import { Ic, Avatar } from './icons';
import { api, toast, colorFor } from '@/lib/toast';
import { socket } from '@/lib/socket';
import { enhanceMicStream } from '@/lib/noise';

// Full-page meeting room (Google Meet style), direct browser-to-browser
// WebRTC mesh over the app's single WebSocket. Everything ephemeral — room
// chat, reactions, raised hands, pins, host mutes — rides socket signals on
// the room channel and is never saved anywhere.
//
// The WebRTC core follows the same hard-won rules as the 1-to-1 CallWindow:
// listeners register BEFORE getUserMedia, signal handling is serialized,
// ICE candidates that arrive early are buffered per peer, and negotiation
// is perfect-negotiation (higher user id is polite).
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
const EMOJIS = ['❤️', '👏', '👍', '🎉', '😮', '😂', '🔥', '💯'];

function TileVideo({ stream, ver, muted, mirror }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) { try { ref.current.srcObject = stream; } catch {} } }, [stream, ver]);
  return <video ref={ref} className={`meet-video ${mirror ? 'mirror' : ''}`} autoPlay playsInline muted={muted} />;
}

export default function MeetRoom({ session, me, onClose }) {
  const channel = session.room_name;
  const roomId = session.room_id || Number(String(channel).slice(5));
  const room = session.room || { title: session.partner?.name || 'Room', topic: '', visibility: 'public', creator_id: null };
  const [occupants, setOccupants] = useState([{ id: me.id, name: me.name, avatar: me.avatar, is_me: true, is_host: Number(room.creator_id) === me.id, is_friend: false, request_sent: false, request_received: false }]);
  const [hostId, setHostId] = useState(room.creator_id ? Number(room.creator_id) : null);
  const [peerIds, setPeerIds] = useState([]);
  const [leaving, setLeaving] = useState([]); // [{id}] tiles animating out after a leave
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [mediaVer, setMediaVer] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false); // camera stays OFF on join — the user opens it when they want
  const [spkOn, setSpkOn] = useState(true);
  const [headphone, setHeadphone] = useState(false);
  const [remoteState, setRemoteState] = useState({}); // userId -> {cam, mic}
  const [speaking, setSpeaking] = useState({}); // userId -> bool
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [myHand, setMyHand] = useState(false);
  const [hands, setHands] = useState({}); // userId -> bool
  const [pinnedId, setPinnedId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const [iShare, setIShare] = useState(false);
  const [floats, setFloats] = useState([]); // {key, userId, emoji}
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'chat' | 'people'
  const [moreOpen, setMoreOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatText, setChatText] = useState('');
  const [chatUnread, setChatUnread] = useState(0);
  const [note, setNote] = useState(null); // {key, text}
  const [secs, setSecs] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sentIds, setSentIds] = useState({}); // friend requests sent from the panel

  const peersRef = useRef(new Map()); // userId -> {pc, polite, makingOffer, ignoreOffer, pendingIce, audioEl, stream}
  const localRef = useRef(null);
  const screenRef = useRef(null);
  const mediaReadyRef = useRef(null);
  const noiseRef = useRef(null); // mic enhancement (RNNoise + gate) handle
  const sigChainRef = useRef(Promise.resolve());
  const offsRef = useRef([]);
  const spkRef = useRef(true);
  const micRef = useRef(true);
  const camRef = useRef(false);
  const myHandRef = useRef(false);
  const pinnedRef = useRef(null);
  const sharingRef = useRef(null);
  const isHostRef = useRef(false);
  const panelRef = useRef(null);
  const occupantsRef = useRef(occupants);
  const peerIdsRef = useRef([]);
  const analysersRef = useRef(new Map()); // userId -> {node, data, offCount}
  const audioCtxRef = useRef(null);
  const mySpeakingRef = useRef(false);
  const startedRef = useRef(Date.now());
  const noteTimerRef = useRef(null);
  const floatKeyRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  occupantsRef.current = occupants;
  panelRef.current = panel;
  isHostRef.current = hostId != null && Number(hostId) === me.id;

  const userOf = id => occupantsRef.current.find(o => Number(o.id) === Number(id)) || (Number(id) === me.id ? { id: me.id, name: me.name, avatar: me.avatar } : { id, name: 'Someone', avatar: null });
  const nameOf = id => userOf(id).name || 'Someone';

  function showNote(text) {
    setNote({ key: Date.now(), text });
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => setNote(null), 4500);
  }

  function broadcast(kind, payload) { socket.send({ t: 'signal', room: channel, kind, payload }); }
  function sendSignal(toId, kind, payload) { socket.send({ t: 'signal', room: channel, to: toId, kind, payload }); }
  function broadcastMediaState() { broadcast('media-state', { cam: camRef.current, mic: micRef.current }); }

  async function loadParticipants() {
    try {
      const d = await api(`/api/rooms/participants?room_id=${roomId}`);
      if (d && Array.isArray(d.occupants)) { setOccupants(d.occupants); setHostId(d.host_id); }
    } catch {}
  }

  // ---------------- WebRTC mesh ----------------
  function closePeer(peerId) {
    const entry = peersRef.current.get(peerId); if (!entry) return;
    try { entry.pc.close(); } catch {}
    if (entry.audioEl) entry.audioEl.remove();
    peersRef.current.delete(peerId);
    analysersRef.current.delete(peerId);
    setRemoteState(rs => { const n = { ...rs }; delete n[peerId]; return n; });
    setSpeaking(sp => { const n = { ...sp }; delete n[peerId]; return n; });
  }

  // The one video sender of a connection. A connection carries exactly ONE
  // video track — the current source (screen while sharing, else camera) —
  // swapped with replaceTrack. Two video tracks made late joiners render
  // the camera instead of the shared screen.
  function videoSender(pc) {
    const tr = pc.getTransceivers().find(t => (t.sender.track && t.sender.track.kind === 'video') || (t.receiver.track && t.receiver.track.kind === 'video'));
    return tr ? tr.sender : null;
  }

  function createPeer(peerId) {
    const existing = peersRef.current.get(peerId); if (existing) return existing;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const entry = { pc, polite: me.id > peerId, makingOffer: false, ignoreOffer: false, audioEl: null, pendingIce: [], stream: new MediaStream() };
    peersRef.current.set(peerId, entry);
    const stream = localRef.current;
    if (stream) stream.getAudioTracks().forEach(t => { try { pc.addTrack(t, stream); } catch {} });
    const shareTrack = screenRef.current?.getVideoTracks()[0];
    const camTrack = stream?.getVideoTracks()[0];
    if (shareTrack) { try { pc.addTrack(shareTrack, screenRef.current); } catch {} }
    else if (camTrack) { try { pc.addTrack(camTrack, stream); } catch {} }
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        sendSignal(peerId, 'offer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
      } catch {} finally { entry.makingOffer = false; }
    };
    pc.onicecandidate = ({ candidate }) => { if (candidate) sendSignal(peerId, 'ice', candidate.toJSON()); };
    pc.ontrack = ({ track }) => {
      if (!entry.stream.getTracks().includes(track)) entry.stream.addTrack(track);
      if (track.kind === 'audio') {
        if (entry.audioEl) entry.audioEl.remove();
        const el = document.createElement('audio');
        el.dataset.webrtc = '1'; el.autoplay = true; el.muted = !spkRef.current;
        el.srcObject = new MediaStream([track]);
        document.body.appendChild(el); entry.audioEl = el;
        setupAnalyser(peerId, new MediaStream([track]));
      }
      track.onended = () => { try { entry.stream.removeTrack(track); } catch {} setMediaVer(v => v + 1); };
      // A remote track is announced before any frame can flow (ICE still
      // connecting — or blocked): it starts muted and unmutes when real
      // frames arrive. The tile shows the avatar until then, never black.
      track.onmute = () => setMediaVer(v => v + 1);
      track.onunmute = () => setMediaVer(v => v + 1);
      setMediaVer(v => v + 1);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closePeer(peerId);
    };
    return entry;
  }

  async function ensurePeer(peerId) {
    if (mediaReadyRef.current) { try { await mediaReadyRef.current; } catch {} }
    return createPeer(peerId);
  }

  async function flushIce(entry) {
    const pc = entry.pc; if (!pc.remoteDescription) return;
    const pend = entry.pendingIce.splice(0);
    for (const c of pend) { try { await pc.addIceCandidate(c); } catch {} }
  }

  function handleSignal(sig) {
    sigChainRef.current = sigChainRef.current.then(() => handleSignalInner(sig)).catch(() => {});
    return sigChainRef.current;
  }

  async function handleSignalInner(sig) {
    if (sig.room !== channel) return;
    const from = sig.from; if (!from || from === me.id) return;
    const p = sig.payload || {};
    switch (sig.kind) {
      case 'bye': closePeer(from); return;
      case 'media-state': setRemoteState(rs => ({ ...rs, [from]: { cam: !!p.cam, mic: !!p.mic } })); return;
      case 'hand': {
        setHands(h => ({ ...h, [from]: !!p.on }));
        if (p.on) showNote(`${p.name || nameOf(from)} raised their hand`);
        return;
      }
      case 'reaction': {
        const key = ++floatKeyRef.current;
        setFloats(f => [...f.slice(-5), { key, userId: from, emoji: p.emoji }]);
        setTimeout(() => setFloats(f => f.filter(x => x.key !== key)), 3200);
        return;
      }
      case 'room-chat': {
        setChatMsgs(ms => [...ms.slice(-80), { key: `${from}-${Date.now()}-${ms.length}`, from, name: p.name || nameOf(from), avatar: p.avatar ?? userOf(from).avatar, text: String(p.text || ''), at: Date.now() }]);
        if (panelRef.current !== 'chat') setChatUnread(u => u + 1);
        return;
      }
      case 'share': {
        setSharingId(p.on ? from : (sharingRef.current === from ? null : sharingRef.current));
        if (p.on) showNote(`${p.name || nameOf(from)} started presenting`);
        return;
      }
      case 'pin': {
        const id = p.userId ? Number(p.userId) : null;
        pinnedRef.current = id; setPinnedId(id);
        if (id) showNote(`${nameOf(id)} was pinned by the host`);
        return;
      }
      case 'host-mute': case 'host-mute-all': {
        if (sig.kind === 'host-mute-all' && isHostRef.current) return;
        applyMic(false);
        showNote('The host muted you');
        return;
      }
      case 'host-unmute': {
        applyMic(true);
        showNote('The host unmuted you');
        return;
      }
      default: break;
    }
    // WebRTC negotiation kinds.
    const entry = await ensurePeer(from); const pc = entry.pc;
    try {
      if (sig.kind === 'offer') {
        const collision = entry.makingOffer || pc.signalingState !== 'stable';
        entry.ignoreOffer = !entry.polite && collision;
        if (entry.ignoreOffer) return;
        await pc.setRemoteDescription(p);
        await flushIce(entry);
        await pc.setLocalDescription();
        sendSignal(from, 'answer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
      } else if (sig.kind === 'answer') {
        await pc.setRemoteDescription(p);
        await flushIce(entry);
      } else if (sig.kind === 'ice') {
        if (!pc.remoteDescription) entry.pendingIce.push(p);
        else { try { await pc.addIceCandidate(p); } catch (e) { if (!entry.ignoreOffer) throw e; } }
      }
    } catch {}
  }

  // ---------------- speaking detection ----------------
  function setupAnalyser(id, stream) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const node = ctx.createAnalyser(); node.fftSize = 512;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(node);
      analysersRef.current.set(id, { node, data: new Uint8Array(node.fftSize), offCount: 0, src });
    } catch {}
  }

  useEffect(() => {
    const iv = setInterval(() => {
      const now = {};
      let changed = false;
      for (const [id, a] of analysersRef.current) {
        a.node.getByteTimeDomainData(a.data);
        let sum = 0; for (let i = 0; i < a.data.length; i += 4) { const v = (a.data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / (a.data.length / 4));
        const on = rms > 0.03;
        if (on) a.offCount = 0; else a.offCount += 1;
        const isOn = on || a.offCount < 3; // ~600ms hangover so the ring doesn't flicker
        now[id] = isOn;
        if (id === me.id) {
          if (isOn !== mySpeakingRef.current) {
            mySpeakingRef.current = isOn;
            socket.send({ t: 'room-speak', room: channel, on: isOn });
          }
        }
      }
      setSpeaking(prev => {
        for (const k of Object.keys(now)) if (!!prev[k] !== !!now[k]) changed = true;
        for (const k of Object.keys(prev)) if (!(k in now) && prev[k]) changed = true;
        return changed ? { ...prev, ...now } : prev;
      });
      // The big tile follows whoever most recently started talking.
      for (const [id, on] of Object.entries(now)) {
        if (on && Number(id) !== me.id) setActiveSpeaker(prev => (prev === Number(id) ? prev : Number(id)));
      }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- mic / camera / speaker ----------------
  function applyMic(next) {
    micRef.current = next; setMicOn(next);
    if (localRef.current) localRef.current.getAudioTracks().forEach(t => { t.enabled = next; });
    broadcastMediaState();
  }
  function toggleMic() { applyMic(!micRef.current); }
  function toggleSpk() {
    const next = !spkOn; setSpkOn(next); spkRef.current = next;
    document.querySelectorAll('audio[data-webrtc]').forEach(a => { a.muted = !next; });
  }
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let alive = true;
    const detect = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const hp = devs.some(d => d.kind === 'audiooutput' && /head|earbud|airpod|bluetooth/i.test(d.label || ''));
        if (alive) setHeadphone(hp);
      } catch {}
    };
    detect();
    try { navigator.mediaDevices.addEventListener('devicechange', detect); } catch {}
    return () => { alive = false; try { navigator.mediaDevices.removeEventListener('devicechange', detect); } catch {} };
  }, []);

  useEffect(() => {
    camRef.current = camOn;
    (async () => {
      const stream = localRef.current; if (!stream) return;
      try {
        const vtrack = stream.getVideoTracks()[0];
        if (camOn) {
          if (!vtrack) {
            const vs = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
            const nt = vs.getVideoTracks()[0];
            stream.addTrack(nt);
            // While I'm sharing, the connections keep carrying the screen;
            // stopShare swaps this camera track in when the share ends.
            if (!screenRef.current) {
              for (const entry of peersRef.current.values()) {
                const sender = videoSender(entry.pc);
                if (sender) sender.replaceTrack(nt).catch(() => {});
                else { try { entry.pc.addTrack(nt, stream); } catch {} }
              }
            }
          } else vtrack.enabled = true;
          setLocalStream(stream);
        } else if (vtrack) vtrack.enabled = false;
        broadcastMediaState();
        setMediaVer(v => v + 1);
      } catch { setCamOn(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn]);

  // ---------------- screen share ----------------
  async function toggleShare() {
    if (iShare) { stopShare(); return; }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenRef.current = ds; setScreenStream(ds);
      const track = ds.getVideoTracks()[0];
      track.onended = () => stopShare();
      for (const entry of peersRef.current.values()) {
        const sender = videoSender(entry.pc);
        try { if (sender) await sender.replaceTrack(track); else entry.pc.addTrack(track, ds); } catch {}
      }
      setIShare(true); sharingRef.current = me.id; setSharingId(me.id);
      broadcast('share', { on: true, name: me.name });
    } catch {}
  }
  function stopShare() {
    if (!screenRef.current) return;
    const camTrack = camRef.current ? (localRef.current?.getVideoTracks()[0] || null) : null;
    for (const entry of peersRef.current.values()) {
      const sender = videoSender(entry.pc);
      if (sender) sender.replaceTrack(camTrack).catch(() => {});
    }
    screenRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
    screenRef.current = null; setScreenStream(null);
    setIShare(false);
    if (sharingRef.current === me.id) { sharingRef.current = null; setSharingId(null); }
    broadcast('share', { on: false, name: me.name });
  }

  // ---------------- hand / reactions / chat ----------------
  function toggleHand() {
    const next = !myHand; myHandRef.current = next; setMyHand(next);
    broadcast('hand', { on: next, name: me.name });
  }
  function sendReaction(emoji) {
    setEmojiOpen(false);
    const key = ++floatKeyRef.current;
    setFloats(f => [...f.slice(-5), { key, userId: me.id, emoji }]);
    setTimeout(() => setFloats(f => f.filter(x => x.key !== key)), 3200);
    broadcast('reaction', { emoji });
  }
  function sendChat(e) {
    e.preventDefault();
    const text = chatText.trim(); if (!text) return;
    setChatText('');
    setChatMsgs(ms => [...ms.slice(-80), { key: `me-${Date.now()}`, from: me.id, name: me.name, avatar: me.avatar, text, at: Date.now() }]);
    broadcast('room-chat', { text, name: me.name, avatar: me.avatar });
  }
  function openPanel(p) {
    setPanel(prev => (prev === p ? null : p));
    setMoreOpen(false);
    if (p === 'chat') setChatUnread(0);
  }

  // ---------------- host controls ----------------
  function hostMute(id) { sendSignal(id, 'host-mute', {}); showNote(`You muted ${nameOf(id)}`); }
  function hostUnmute(id) { sendSignal(id, 'host-unmute', {}); }
  function hostMuteAll() { broadcast('host-mute-all', {}); showNote('You muted everyone'); }
  function hostPin(id) {
    const next = pinnedRef.current === id ? null : id;
    pinnedRef.current = next; setPinnedId(next);
    broadcast('pin', { userId: next });
  }

  // ---------------- friend actions ----------------
  async function addFriend(id) {
    try { await api('/api/people/add', { method: 'POST', body: { user_id: id } }); setSentIds(s => ({ ...s, [id]: true })); toast('Friend request sent'); }
    catch (e) { toast(e.message); }
  }
  async function acceptFriend(id) {
    try {
      await api('/api/people/respond', { method: 'POST', body: { user_id: id, accept: true } });
      setOccupants(os => os.map(o => Number(o.id) === Number(id) ? { ...o, is_friend: true, request_received: false } : o));
      toast('Friend request accepted');
    } catch (e) { toast(e.message); }
  }

  // ---------------- lifecycle ----------------
  function cleanupMedia() {
    for (const off of offsRef.current) { try { off(); } catch {} }
    offsRef.current = [];
    socket.leave(channel);
    for (const pid of [...peersRef.current.keys()]) closePeer(pid);
    if (screenRef.current) { screenRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} }); screenRef.current = null; }
    if (localRef.current) { localRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} }); localRef.current = null; }
    if (noiseRef.current) { noiseRef.current.close(); noiseRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
  }
  function leave() {
    broadcast('bye', {});
    if (mySpeakingRef.current) socket.send({ t: 'room-speak', room: channel, on: false });
    cleanupMedia();
    onCloseRef.current();
  }

  useEffect(() => {
    // Listen FIRST, microphone second (the P21 rule): a signal that lands
    // while getUserMedia is still pending must never be dropped.
    socket.join(channel);
    offsRef.current.push(socket.on('signal', handleSignal));
    offsRef.current.push(socket.on('peers', m => {
      if (m.room !== channel) return;
      const ids = (m.peers || []).filter(id => id !== me.id);
      // Departed tiles animate out instead of vanishing mid-frame.
      for (const pid of peerIdsRef.current) {
        if (!ids.includes(pid)) {
          setLeaving(lv => (lv.some(x => x.id === pid) ? lv : [...lv, { id: pid }]));
          setTimeout(() => setLeaving(lv => lv.filter(x => x.id !== pid)), 340);
        }
      }
      peerIdsRef.current = ids;
      setPeerIds(ids);
      // A pin or presentation must not outlive the person: if they left,
      // the spotlight falls back to the normal layout.
      if (pinnedRef.current && !ids.includes(pinnedRef.current)) { pinnedRef.current = null; setPinnedId(null); }
      if (sharingRef.current && sharingRef.current !== me.id && !ids.includes(sharingRef.current)) { sharingRef.current = null; setSharingId(null); }
      for (const id of ids) { if (me.id < id) createPeer(id); }
      for (const pid of [...peersRef.current.keys()]) { if (!ids.includes(pid)) closePeer(pid); }
      loadParticipants();
      // A newcomer learns my current state without asking.
      broadcastMediaState();
      if (myHandRef.current) broadcast('hand', { on: true, name: me.name });
      if (pinnedRef.current && isHostRef.current) broadcast('pin', { userId: pinnedRef.current });
      if (sharingRef.current === me.id) broadcast('share', { on: true, name: me.name });
    }));
    loadParticipants();
    mediaReadyRef.current = (async () => {
      const raw = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false, // not requested at join; the camera effect fetches it on first toggle-on
      });
      const nz = await enhanceMicStream(raw);
      noiseRef.current = nz;
      const stream = nz.stream;
      localRef.current = stream;
      setLocalStream(stream);
      stream.getAudioTracks().forEach(t => { t.enabled = micRef.current; });
      setupAnalyser(me.id, stream);
      for (const entry of peersRef.current.values()) stream.getAudioTracks().forEach(tk => { try { entry.pc.addTrack(tk, stream); } catch {} });
      broadcastMediaState();
      return stream;
    })();
    mediaReadyRef.current.catch(() => { toast('Could not start the meeting — check microphone/camera permission'); });
    return () => { cleanupMedia(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecs(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const fn = () => setIsMobile(mq.matches);
    fn();
    try { mq.addEventListener('change', fn); } catch { mq.addListener(fn); }
    return () => { try { mq.removeEventListener('change', fn); } catch { mq.removeListener(fn); } };
  }, []);
  useEffect(() => { sharingRef.current = sharingId; }, [sharingId]);

  // ---------------- layout ----------------
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  const allIds = [me.id, ...peerIds];
  const spotlightId = pinnedId ?? sharingId ?? (isMobile ? (activeSpeaker && allIds.includes(activeSpeaker) && activeSpeaker !== me.id ? activeSpeaker : (peerIds[0] ?? null)) : null);
  const isHost = hostId != null && Number(hostId) === me.id;

  function tileState(id) {
    if (id === me.id) return { cam: camOn || iShare, mic: micOn, hand: myHand };
    return { cam: !!remoteState[id]?.cam || sharingId === id, mic: remoteState[id]?.mic !== false, hand: !!hands[id] };
  }
  function streamFor(id) {
    if (id === me.id) return iShare ? screenStream : localStream;
    return peersRef.current.get(id)?.stream || null;
  }
  function renderTile(id, cls = '', idx = 0) {
    const u = userOf(id);
    const st = tileState(id);
    const stream = streamFor(id);
    const vtracks = stream ? stream.getVideoTracks() : [];
    const hasVideo = vtracks.length > 0 && st.cam && (id === me.id || vtracks.some(t => !t.muted));
    const myFloats = floats.filter(f => f.userId === id);
    const isLeaving = leaving.some(x => x.id === id);
    return (
      <div key={id} className={`meet-tile ${cls} ${speaking[id] ? 'is-speaking' : ''} ${hasVideo ? 'hasvid' : ''} ${isLeaving ? 'leaving' : ''}`} style={{ animationDelay: `${Math.min(idx * 70, 350)}ms` }}>
        {hasVideo
          ? <TileVideo stream={stream} ver={mediaVer} muted={id === me.id} mirror={id === me.id && !iShare} />
          : <div className="meet-camoff"><span className={`meet-avring ${speaking[id] ? 'on' : ''}`}><Avatar user={{ ...u, color: colorFor(id) }} size={72} /></span></div>}
        {st.hand ? <span className="meet-handbdg"><Ic n="hand" size={13} /></span> : null}
        {!st.mic ? <span className="meet-micbdg"><Ic n="micoff" size={12} /></span> : null}
        {sharingId === id ? <span className="meet-preschip"><Ic n="share" size={12} />{id === me.id ? "You're presenting" : `${u.name.split(' ')[0]} is presenting`}</span> : null}
        {pinnedId === id ? <span className="meet-pinchip"><Ic n="pin" size={11} />Pinned</span> : null}
        <span className="meet-name">{id === me.id ? 'You' : u.name}</span>
        {myFloats.map(f => <span key={f.key} className="meet-float">{f.emoji}</span>)}
      </div>
    );
  }

  const others = allIds.filter(id => id !== spotlightId);
  const leavingIds = leaving.map(l => l.id).filter(id => !allIds.includes(id));
  const stage = spotlightId != null ? (
    <div className="meet-spotwrap">
      <div className="meet-spotmain">{renderTile(spotlightId, 'main')}</div>
      {!isMobile && <div className="meet-film">{[...others, ...leavingIds].map((id, i) => renderTile(id, '', i))}</div>}
      {isMobile && spotlightId !== me.id && (
        <div className="meet-self-float">{renderTile(me.id, 'float')}</div>
      )}
    </div>
  ) : (
    <div className={`meet-grid ${allIds.length <= 4 ? `n${allIds.length}` : 'many'}`}>{[...allIds, ...leavingIds].map((id, i) => renderTile(id, '', i))}</div>
  );
  const mobileStrip = isMobile && spotlightId != null ? allIds.filter(id => id !== spotlightId && id !== me.id) : [];

  const chatPanel = (
    <aside className="meet-panel">
      <div className="meet-panel-head"><div><b>Room chat</b><small>Only people in this room · not saved</small></div><button type="button" className="meet-x" aria-label="Close chat" onClick={() => setPanel(null)}>×</button></div>
      <div className="meet-chat-msgs">
        {chatMsgs.map(m => (
          <div key={m.key} className="meet-cmsg">
            <b className={m.from === me.id ? 'me' : ''}>{m.from === me.id ? 'You' : m.name}<time>{new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</time></b>
            <p>{m.text}</p>
          </div>
        ))}
        {chatMsgs.length === 0 && <p className="meet-chat-empty">No messages yet. Say hello to the room.</p>}
      </div>
      <form className="meet-chat-form" onSubmit={sendChat}>
        <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Message the room…" aria-label="Message the room" />
        <button type="submit" className="meet-send" aria-label="Send message"><Ic n="send" size={16} /></button>
      </form>
    </aside>
  );

  const peoplePanel = (
    <aside className="meet-panel">
      <div className="meet-panel-head"><div><b>Participants</b><small>{allIds.length} people in this room{isHost ? ' · Host controls — only you see these' : ''}</small></div><button type="button" className="meet-x" aria-label="Close participants" onClick={() => setPanel(null)}>×</button></div>
      {isHost && <button type="button" className="meet-muteall" onClick={hostMuteAll}><Ic n="micoff" size={14} />Mute everyone</button>}
      <div className="meet-plist">
        {occupants.filter(o => allIds.includes(Number(o.id))).map(o => {
          const id = Number(o.id);
          const st = tileState(id);
          const sentNow = !!sentIds[id];
          return (
            <div key={id} className="meet-prow">
              <Avatar user={{ ...o, color: colorFor(id) }} size={40} />
              <span className="meet-pwho">
                <b>{o.name}{o.is_host ? <span className="meet-tag host">Host</span> : null}{pinnedId === id ? <span className="meet-tag pin">Pinned</span> : null}</b>
                <small className={!st.mic && id !== me.id ? 'red' : ''}>{id === me.id ? 'You' : speaking[id] ? 'Speaking now' : sharingId === id ? 'Presenting' : st.hand ? 'Hand raised' : !st.mic ? 'Muted' : !st.cam ? 'Camera off' : 'In the room'}</small>
              </span>
              {st.hand && id !== me.id ? <span className="meet-handst"><Ic n="hand" size={12} /></span> : null}
              {id !== me.id && (
                o.is_friend ? <span className="meet-friends"><Ic n="check" size={13} />Friends</span>
                : o.request_received ? <button type="button" className="meet-sentbtn" onClick={() => acceptFriend(id)}>Accept</button>
                : (o.request_sent || sentNow) ? <span className="meet-sentbtn static"><Ic n="check" size={13} />Requested</span>
                : <button type="button" className="meet-addbtn" onClick={() => addFriend(id)}><Ic n="adduser" size={13} />Add friend</button>
              )}
              {isHost && id !== me.id && (
                <span className="meet-hostbtns">
                  <button type="button" className={`meet-hbtn ${pinnedId === id ? 'on' : ''}`} title={pinnedId === id ? 'Unpin' : 'Pin'} aria-label={pinnedId === id ? 'Unpin' : 'Pin'} onClick={() => hostPin(id)}><Ic n="pin" size={13} /></button>
                  {st.mic
                    ? <button type="button" className="meet-hbtn" title="Mute" aria-label="Mute" onClick={() => hostMute(id)}><Ic n="mic" size={13} /></button>
                    : <button type="button" className="meet-hbtn unmute" title="Unmute" aria-label="Unmute" onClick={() => hostUnmute(id)}><Ic n="mic" size={13} /></button>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <div className="meet-root" role="dialog" aria-label="Meeting room">
      <div className="meet-top">
        <span className="meet-ttwrap">
          {isMobile && <button type="button" className="meet-chev" aria-label="Minimise" onClick={leave}><Ic n="chevD" size={15} /></button>}
          <span className="meet-tt"><b>{room.title}</b><small>{room.visibility === 'private' ? 'Private' : 'Public'} room · English practice</small></span>
        </span>
        {note ? <span className="meet-note" key={note.key}>{note.text}</span> : null}
        <span className="meet-topright">
          {isMobile && <button type="button" className="meet-iconbtn" aria-label="Room chat" onClick={() => openPanel('chat')}><Ic n="chat" size={16} />{chatUnread ? <span className="meet-bdg">{chatUnread}</span> : null}</button>}
          <span className="meet-live"><i></i>{allIds.length} in the room</span>
        </span>
      </div>

      <div className="meet-body">
        <div className={`meet-stagewrap ${sharingId ? 'presenting' : ''}`}>
          {stage}
          {isMobile && mobileStrip.length > 0 && <div className="meet-strip">{mobileStrip.map(id => renderTile(id))}</div>}
          {iShare && <div className="meet-you-pres">You're presenting — everyone sees your screen</div>}
        </div>
        {!isMobile && panel === 'chat' && chatPanel}
        {!isMobile && panel === 'people' && peoplePanel}
      </div>
      {isMobile && panel === 'chat' && <div className="meet-mpanel">{chatPanel}</div>}
      {isMobile && panel === 'people' && <div className="meet-mpanel">{peoplePanel}</div>}

      {emojiOpen && (
        <div className="meet-emojis">
          {EMOJIS.map(e => <button type="button" key={e} onClick={() => sendReaction(e)} aria-label={`Send ${e}`}>{e}</button>)}
        </div>
      )}
      {moreOpen && isMobile && (
        <div className="meet-sheet">
          <div className="meet-grab"></div>
          <button type="button" className="meet-sitem" onClick={() => { setMoreOpen(false); toggleShare(); }}><span className="meet-sic"><Ic n="share" size={17} /></span>Share screen{iShare ? <small className="on">Sharing now</small> : null}</button>
          <button type="button" className="meet-sitem" onClick={() => { setMoreOpen(false); toggleSpk(); }}><span className="meet-sic"><Ic n={headphone ? 'headphone' : 'speaker'} size={17} /></span>{headphone ? 'Headphone' : 'Speaker'}<small className={spkOn ? 'on' : ''}>{spkOn ? (headphone ? 'Connected · sound on' : 'Sound on') : 'Sound off'}</small></button>
          <button type="button" className="meet-sitem" onClick={() => openPanel('people')}><span className="meet-sic"><Ic n="people" size={17} /></span>Participants<small>{allIds.length} people</small></button>
          <button type="button" className="meet-sitem" onClick={() => openPanel('chat')}><span className="meet-sic"><Ic n="chat" size={17} /></span>Room chat{chatUnread ? <small>{chatUnread} new</small> : null}</button>
        </div>
      )}

      <div className="meet-bar">
        {!isMobile && <div className="meet-roominfo">{room.title}<small>{mm}:{ss} · {allIds.length} participants</small></div>}
        <div className="meet-controls">
          <button type="button" className={`meet-cbtn ${!micOn ? 'off' : ''}`} title={micOn ? 'Mute' : 'Unmute'} aria-label="Toggle microphone" onClick={toggleMic}><Ic n={micOn ? 'mic' : 'micoff'} size={19} /></button>
          <button type="button" className={`meet-cbtn ${!camOn ? 'off' : ''}`} title={camOn ? 'Turn camera off' : 'Turn camera on'} aria-label="Toggle camera" onClick={() => setCamOn(c => !c)}><Ic n={camOn ? 'video' : 'videooff'} size={19} /></button>
          {!isMobile && <button type="button" className={`meet-cbtn ${iShare ? 'shareon' : ''}`} title="Share screen" aria-label="Share screen" onClick={toggleShare}><Ic n="share" size={19} /></button>}
          {!isMobile && <button type="button" className={`meet-cbtn ${!spkOn ? 'off' : ''}`} title={headphone ? 'Headphones connected' : 'Speaker'} aria-label="Toggle speaker" onClick={toggleSpk}><Ic n={headphone ? 'headphone' : 'speaker'} size={19} /></button>}
          <button type="button" className={`meet-cbtn ${myHand ? 'handon' : ''}`} title="Raise hand" aria-label="Raise hand" onClick={toggleHand}><Ic n="hand" size={19} /></button>
          <button type="button" className={`meet-cbtn ${emojiOpen ? 'emojion' : ''}`} title="Send a reaction" aria-label="Send a reaction" onClick={() => setEmojiOpen(o => !o)}><Ic n="emoji" size={19} /></button>
          {isMobile && <button type="button" className="meet-cbtn" title="More" aria-label="More options" onClick={() => setMoreOpen(o => !o)}>•••</button>}
          <button type="button" className="meet-leave" onClick={leave}><Ic n="phone" size={16} />{!isMobile && 'Leave'}</button>
        </div>
        {!isMobile && (
          <div className="meet-sidebtns">
            <button type="button" className={`meet-sbtn ${panel === 'people' ? 'active' : ''}`} title="Participants" aria-label="Participants" onClick={() => openPanel('people')}><Ic n="people" size={19} /><span className="meet-sbdg">{allIds.length}</span></button>
            <button type="button" className={`meet-sbtn ${panel === 'chat' ? 'active' : ''}`} title="Room chat" aria-label="Room chat" onClick={() => openPanel('chat')}><Ic n="chat" size={19} />{chatUnread ? <span className="meet-sbdg red">{chatUnread}</span> : null}</button>
          </div>
        )}
      </div>
    </div>
  );
}

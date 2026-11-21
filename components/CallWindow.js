'use client';
import { useEffect, useRef, useState } from 'react';
import { Ic, Avatar } from './icons';
import { api, toast, initials } from '@/lib/toast';
import { socket } from '@/lib/socket';
import { ReportModal, BlockModal } from './views/PeopleView';

// Call popup — same markup/classes as the approved preview (.callwin).
// Direct WebRTC, browser-to-browser: Opus audio with echo cancellation, noise
// suppression and auto gain for crystal-clear voice. Signaling (SDP offers /
// answers + ICE candidates) and the video-consent handshake ride the app's
// WebSocket — no polling, and the media itself never touches any server.
//
// Flow (1-to-1): Start Calling opens this window "searching"; when a partner
// is found they must ACCEPT first (their profile shows here while it rings).
// The microphone is asked for as the window opens; the camera is only asked
// for when someone taps the video button — and then the partner gets a
// video request and must accept (with their own camera permission) before
// any video starts.
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

export default function CallWindow({ session, me, onClose, onAddPeople }) {
  const roomId = session.room_id || (String(session.room_name || '').startsWith('room-') ? Number(String(session.room_name).slice(5)) : null);
  const [min, setMin] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [spkOn, setSpkOn] = useState(true);
  const [camOn, setCamOn] = useState(!!roomId && session.kind === 'video');
  const [phase, setPhase] = useState(session.phase || 'live'); // searching | ringing | live
  const [status, setStatus] = useState('Calling…');
  const [secs, setSecs] = useState(0);
  const [rate, setRate] = useState(null); // {call_id, partner} after end when >= 5 min
  const [stars, setStars] = useState({ fluency: 0, speaking: 0, behaviour: 0 });
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [friendSent, setFriendSent] = useState(false);
  const [videoState, setVideoState] = useState('off'); // off | requested | on  (1-to-1 consent flow)
  const [videoAsk, setVideoAsk] = useState(false); // partner asked me for video
  const [remoteVideo, setRemoteVideo] = useState(false); // partner's video is showing
  const peersRef = useRef(new Map()); // userId -> { pc, polite, makingOffer, ignoreOffer, audioEl }
  const localRef = useRef(null); // my own mic/camera stream
  const connectedRef = useRef(false);
  const endedRef = useRef(false);
  const spkRef = useRef(true);
  const phaseRef = useRef(phase);
  const offsRef = useRef([]); // socket unsubscribers
  const winRef = useRef(null);
  const selfVideoRef = useRef(null);
  const remoteRef = useRef(null);
  const startedRef = useRef(Date.now());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const partner = session.partner || { name: session.title || 'Room', avatar: null };
  const videoOn = videoState === 'on' || remoteVideo;

  function goPhase(p) { phaseRef.current = p; setPhase(p); }

  function sendSignal(toId, kind, payload) {
    socket.send({ t: 'signal', room: session.room_name, to: toId, kind, payload });
  }

  function closePeer(peerId) {
    const entry = peersRef.current.get(peerId); if (!entry) return;
    try { entry.pc.close(); } catch {}
    if (entry.audioEl) entry.audioEl.remove();
    peersRef.current.delete(peerId);
  }

  function createPeer(peerId) {
    const existing = peersRef.current.get(peerId); if (existing) return existing;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    // Perfect negotiation: the higher user id is the polite peer (rolls back on a clash).
    const entry = { pc, polite: me.id > peerId, makingOffer: false, ignoreOffer: false, audioEl: null };
    peersRef.current.set(peerId, entry);
    const stream = localRef.current;
    if (stream) stream.getTracks().forEach(t => { try { pc.addTrack(t, stream); } catch {} });
    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        sendSignal(peerId, 'offer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
      } catch {} finally { entry.makingOffer = false; }
    };
    pc.onicecandidate = ({ candidate }) => { if (candidate) sendSignal(peerId, 'ice', candidate.toJSON()); };
    pc.ontrack = ({ track }) => {
      if (track.kind === 'audio') {
        const el = document.createElement('audio');
        el.dataset.webrtc = '1'; el.autoplay = true; el.muted = !spkRef.current;
        el.srcObject = new MediaStream([track]);
        document.body.appendChild(el); entry.audioEl = el;
      } else if (track.kind === 'video') {
        if (remoteRef.current) remoteRef.current.srcObject = new MediaStream([track]);
        setRemoteVideo(true);
        track.onended = () => setRemoteVideo(false);
        setStatus('Connected');
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (!connectedRef.current) { connectedRef.current = true; startedRef.current = Date.now(); setSecs(0); }
        setStatus('Connected');
      }
      if (pc.connectionState === 'failed') {
        if (partner.id && Number(partner.id) === peerId) { endRef.current && endRef.current(); }
        else closePeer(peerId);
      }
      if (pc.connectionState === 'closed') closePeer(peerId);
    };
    return entry;
  }

  async function handleSignal(sig) {
    if (sig.room !== session.room_name) return;
    const from = sig.from; if (!from || from === me.id) return;
    if (sig.kind === 'bye') {
      if (partner.id && Number(partner.id) === from) { endRef.current && endRef.current(); }
      else closePeer(from);
      return;
    }
    // Video consent handshake (1-to-1 only).
    if (sig.kind === 'video-request') { setVideoAsk(true); return; }
    if (sig.kind === 'video-accepted') { setVideoState('on'); setCamOn(true); return; }
    if (sig.kind === 'video-declined') { setVideoState('off'); toast('Partner declined video'); return; }
    if (sig.kind === 'video-off') { setRemoteVideo(false); return; }
    const entry = createPeer(from); const pc = entry.pc;
    try {
      if (sig.kind === 'offer') {
        const collision = entry.makingOffer || pc.signalingState !== 'stable';
        entry.ignoreOffer = !entry.polite && collision;
        if (entry.ignoreOffer) return;
        await pc.setRemoteDescription(sig.payload);
        await pc.setLocalDescription();
        sendSignal(from, 'answer', { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
      } else if (sig.kind === 'answer') {
        await pc.setRemoteDescription(sig.payload);
      } else if (sig.kind === 'ice') {
        try { await pc.addIceCandidate(sig.payload); } catch (e) { if (!entry.ignoreOffer) throw e; }
      }
    } catch {}
  }

  function cleanupMedia() {
    for (const off of offsRef.current) { try { off(); } catch {} }
    offsRef.current = [];
    if (session.room_name) socket.leave(session.room_name);
    for (const pid of [...peersRef.current.keys()]) closePeer(pid);
    if (localRef.current) { localRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} }); localRef.current = null; }
  }

  useEffect(() => {
    if (phaseRef.current === 'searching') return; // nothing to connect yet
    let ringTimer = null;
    (async () => {
      try {
        // Microphone first — the camera is never asked for here. Rooms joined
        // as video are the one exception (the member chose video to enter).
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: roomId && session.kind === 'video' ? VIDEO_CONSTRAINTS : false,
        });
        localRef.current = stream;
        if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
        setStatus(roomId ? 'In room' : 'Ringing…');
        socket.join(session.room_name);
        offsRef.current.push(socket.on('signal', handleSignal));
        if (roomId) {
          // Mesh: the lower user id opens the connection to each other person;
          // anyone who left gets closed.
          offsRef.current.push(socket.on('peers', m => {
            if (m.room !== session.room_name) return;
            const ids = (m.peers || []).filter(id => id !== me.id);
            for (const id of ids) { if (me.id < id) createPeer(id); }
            for (const pid of [...peersRef.current.keys()]) { if (!ids.includes(pid)) closePeer(pid); }
          }));
        } else if (partner.id) {
          offsRef.current.push(socket.on('call-accepted', m => {
            if (m.call_id !== session.call_id || phaseRef.current !== 'ringing') return;
            if (ringTimer) { clearTimeout(ringTimer); ringTimer = null; }
            goPhase('live');
            createPeer(Number(partner.id));
          }));
          offsRef.current.push(socket.on('call-declined', m => {
            if (m.call_id !== session.call_id) return;
            toast('Partner declined the call');
            onCloseRef.current();
          }));
          if (phaseRef.current === 'ringing') {
            ringTimer = setTimeout(async () => {
              if (phaseRef.current !== 'ringing') return;
              try { await api('/api/calls/answer', { method: 'POST', body: { call_id: session.call_id, action: 'cancel' } }); } catch {}
              toast('No answer');
              onCloseRef.current();
            }, 45000);
          }
        }
      } catch (e) { setStatus('Could not connect'); toast('Call could not connect — check microphone/camera permission'); }
    })();
    return () => {
      // NOTE: no 'bye' is sent from here. React StrictMode (dev) unmounts and
      // remounts every component once, so a 'bye' sent from a cleanup kills a
      // healthy call the moment it connects. A real hang-up sends 'bye' from
      // endCall() instead; this cleanup only releases local resources, which
      // the remount re-acquires.
      if (ringTimer) clearTimeout(ringTimer);
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'searching') return;
    const t = setInterval(() => setSecs(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    (async () => {
      const stream = localRef.current; if (!stream) return;
      try {
        const vtrack = stream.getVideoTracks()[0];
        if (camOn) {
          if (!vtrack) {
            const vs = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
            const nt = vs.getVideoTracks()[0];
            stream.addTrack(nt);
            for (const entry of peersRef.current.values()) { try { entry.pc.addTrack(nt, stream); } catch {} }
          } else vtrack.enabled = true;
          if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
        } else if (vtrack) vtrack.enabled = false;
      } catch { setCamOn(false); setVideoState('off'); }
    })();
  }, [camOn]);

  function toggleMic() { const next = !micOn; setMicOn(next); if (localRef.current) localRef.current.getAudioTracks().forEach(t => { t.enabled = next; }); }
  function toggleSpk() { const next = !spkOn; setSpkOn(next); spkRef.current = next; document.querySelectorAll('audio[data-webrtc]').forEach(a => { a.muted = !next; }); }

  // Video button. Rooms: just my own camera. 1-to-1: turning video ON needs
  // the partner's accept (and their camera permission) — turning it OFF is free.
  function toggleVideo() {
    if (!partner.id) { setCamOn(c => !c); return; }
    if (videoState === 'on') {
      setVideoState('off'); setCamOn(false);
      sendSignal(Number(partner.id), 'video-off', {});
      return;
    }
    if (videoState === 'requested') return; // already waiting for the answer
    setVideoState('requested');
    sendSignal(Number(partner.id), 'video-request', {});
  }
  async function acceptVideo() {
    setVideoAsk(false);
    try {
      // My camera permission comes first — only then does the requester hear yes.
      const stream = localRef.current; if (!stream) throw new Error('no media');
      if (!stream.getVideoTracks()[0]) {
        const vs = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
        const nt = vs.getVideoTracks()[0];
        stream.addTrack(nt);
        for (const entry of peersRef.current.values()) { try { entry.pc.addTrack(nt, stream); } catch {} }
      } else stream.getVideoTracks()[0].enabled = true;
      if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
      setVideoState('on'); setCamOn(true);
      sendSignal(Number(partner.id), 'video-accepted', {});
    } catch {
      sendSignal(Number(partner.id), 'video-declined', {});
      toast('Camera permission denied');
    }
  }
  function declineVideo() {
    setVideoAsk(false);
    sendSignal(Number(partner.id), 'video-declined', {});
  }

  const endRef = useRef(null);
  async function endCall() {
    if (phaseRef.current === 'searching') { onClose(); return; }
    if (phaseRef.current === 'ringing') {
      // I called, they have not accepted yet — this is a cancel, not an end.
      try { await api('/api/calls/answer', { method: 'POST', body: { call_id: session.call_id, action: 'cancel' } }); } catch {}
      cleanupMedia();
      onClose();
      return;
    }
    if (!endedRef.current) {
      endedRef.current = true;
      if (partner.id) sendSignal(Number(partner.id), 'bye', {});
      else sendSignal(null, 'bye', {});
      cleanupMedia();
    }
    if (!partner.id) { onClose(); return; }
    try {
      const r = await api('/api/calls/end', { method: 'POST', body: { call_id: session.call_id } });
      setRate({ call_id: session.call_id, locked: !r.can_rate }); return;
    } catch {}
    onClose();
  }
  endRef.current = endCall;
  async function submitRate() {
    try { await api('/api/calls/rate', { method: 'POST', body: { call_id: rate.call_id, ...stars } }); toast('Thanks for rating'); } catch (e) { toast(e.message); }
    onClose();
  }
  function onDragStart(e) {
    const win = winRef.current; if (!win) return;
    const r = win.getBoundingClientRect(); const dx = e.clientX - r.left, dy = e.clientY - r.top;
    function move(ev) { win.style.left = Math.max(0, ev.clientX - dx) + 'px'; win.style.top = Math.max(0, ev.clientY - dy) + 'px'; win.style.right = 'auto'; win.style.bottom = 'auto'; }
    function up() { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }
  const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');

  if (rate) return (
    <div className="overlay open" role="dialog" aria-modal="true" aria-label="Rate your partner"><div className="modal">
      <div className="modal-head"><div><h3>Rate your partner</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="rate-partner"><Avatar user={partner} size={46} /><span><b>{partner.name}</b><small>{partner.note || ''}</small></span><span className="rate-dur">{mm}:{ss}</span></div>
      {session.matched && partner.id ? <div className="friend-row"><span className="fr-txt">{friendSent ? 'Friend request sent' : 'Want to practise with this partner again?'}</span><button type="button" className="fr-btn" disabled={friendSent} onClick={async () => { try { await api('/api/people/add', { method: 'POST', body: { user_id: partner.id } }); setFriendSent(true); toast('Friend request sent'); } catch (e) { toast(e.message); } }}>{friendSent ? 'Request sent' : 'Send friend request'}</button></div> : null}
      {partner.id ? <div className="rate-block-row"><span style={{ display: 'flex', gap: 7, flex: '0 0 auto' }}><button type="button" className="fr-btn" style={{ background: '#FFF4D6', color: '#7A5A00' }} onClick={() => setShowReport(true)}>Report</button><button type="button" className="fr-btn rate-block-btn" onClick={() => setShowBlock(true)}>Block</button></span></div> : null}
      {rate.locked ? <div>
        <p className="field-note" style={{ margin: '4px 0 14px' }}>⏱ This call was too short to rate — ratings open after 5 minutes together.</p>
        <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Close</button></div>
      </div> : <div>
        {[['fluency', 'Fluency'], ['speaking', 'Speaking'], ['behaviour', 'Behaviour']].map(([k, label]) => (
          <div className="rate-row" key={k}><label>{label}</label>
            <div className="stars" role="radiogroup" aria-label={`${label} rating`}>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={stars[k] >= n ? 'on' : ''} onClick={() => setStars(s2 => ({ ...s2, [k]: n }))} aria-label={`${label} ${n}`}>★</button>)}</div>
          </div>
        ))}
        <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Skip</button><button type="button" className="btn-accent2" onClick={submitRate}>Save rating →</button></div>
      </div>}
      {showReport && <ReportModal person={partner} onClose={() => setShowReport(false)} />}
      {showBlock && <BlockModal person={partner} onClose={() => setShowBlock(false)} onBlocked={() => { setShowBlock(false); onClose(); }} />}
    </div></div>
  );

  if (phase === 'searching') return (
    <div className="callwin open" ref={winRef} role="dialog" aria-label="Call window" style={{ right: 18, bottom: 18 }}>
      <div className="callwin-head" onPointerDown={onDragStart}><span className="drag-dots">⠿</span>
        <div><b>Start calling</b><small>Audio call · 00:00</small></div>
        <div className="hw">
          <button type="button" className="endb" title="End call" aria-label="End call" onClick={endCall}><Ic n="phone" /></button>
        </div>
      </div>
      <div className="call-stage ringing">
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <span className="avatar big-av" style={{ background: '#46536A' }}><Ic n="phone" size={34} /></span>
          <div className="status-txt">Searching your partner…</div>
          <div className="sub-txt">Audio call</div>
        </div>
      </div>
      <div className="cw-enc"><Ic n="lock" size={14} /><span>Encrypted. Only people in the call can hear you.</span></div>
      <div className="call-controls">
        <button type="button" className="cc-end" title="End call" aria-label="End call" onClick={endCall}><Ic n="phone" /></button>
      </div>
    </div>
  );

  if (min) return (
    <div className="callmin open" style={{ display: 'flex' }}>
      <Avatar user={partner} size={36} /><span><b>{partner.name}</b><small>{mm}:{ss}</small></span>
      <button type="button" onClick={toggleMic} title="Mute / unmute" aria-label="Mute / unmute"><Ic n="mic" /></button>
      <button type="button" onClick={() => setMin(false)} title="Restore call" aria-label="Restore call"><Ic n="plus" /></button>
      <button type="button" className="endb" onClick={endCall} title="End call" aria-label="End call"><Ic n="phone" /></button>
    </div>
  );

  const statusText = phase === 'ringing' ? 'Waiting for them to accept…' : status;
  return (
    <div className="callwin open" ref={winRef} role="dialog" aria-label="Call window" style={{ right: 18, bottom: 18 }}>
      <div className="callwin-head" onPointerDown={onDragStart}><span className="drag-dots">⠿</span>
        <div><b>{partner.name}</b><small>{partner.roomPeople != null ? `Room · ${partner.roomPeople} people` : videoOn ? 'Video call' : 'Audio call'} · {mm}:{ss}</small></div>
        <div className="hw">
          <button type="button" title="Minimize" aria-label="Minimize call" onClick={() => setMin(true)}><Ic n="minus" /></button>
          <button type="button" className="endb" title="End call" aria-label="End call" onClick={endCall}><Ic n="phone" /></button>
        </div>
      </div>
      <div className={`call-stage ${statusText !== 'Connected' ? 'ringing' : ''}`}>
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <span className="avatar big-av" style={{ background: partner.color || '#0E9594', overflow: 'hidden' }}>{partner.avatar ? <img src={partner.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(partner.name)}</span>
          <div className="status-txt">{statusText}</div>
          <div className="sub-txt">{videoOn ? 'Video call' : 'Audio call'}</div>
          <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', borderRadius: 14, marginTop: 10, display: remoteVideo ? 'block' : 'none' }} />
        </div>
        <div className="cw-selfview" hidden={!camOn}><video ref={selfVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><span>You · camera on</span></div>
      </div>
      {videoAsk && partner.id ? <div className="cw-video-ask"><span>{partner.name} wants to turn on video</span><span className="cw-va-btns"><button type="button" className="fr-btn" onClick={declineVideo}>Decline</button><button type="button" className="fr-btn cw-va-accept" onClick={acceptVideo}>Accept</button></span></div> : null}
      {videoState === 'requested' && partner.id ? <div className="cw-video-ask"><span>Waiting for {partner.name} to accept video…</span></div> : null}
      <div className="cw-enc"><Ic n="lock" size={14} /><span>Encrypted. Only people in the call can hear you.</span></div>
      <div className="call-controls">
        <button type="button" className={`cc-btn ${!micOn ? 'off' : ''}`} title="Mute microphone" aria-label="Mute microphone" onClick={toggleMic}><Ic n="mic" /></button>
        <button type="button" className={`cc-btn ${!spkOn ? 'off' : ''}`} title="Speaker" aria-label="Toggle speaker" onClick={toggleSpk}><Ic n="speaker" /></button>
        <button type="button" className={`cc-btn cc-video ${camOn ? 'off' : ''}`} title="Turn camera on" aria-label="Turn camera on" onClick={toggleVideo} disabled={phase === 'ringing'}><Ic n="video" /></button>
        <button type="button" className="cc-btn" title="Add people" aria-label="Add people" onClick={() => onAddPeople && onAddPeople()}><Ic n="adduser" /></button>
        <button type="button" className="cc-btn" title="Minimize" aria-label="Minimize call" onClick={() => setMin(true)}><Ic n="minus" /></button>
        <button type="button" className="cc-end" title="End call" aria-label="End call" onClick={endCall}><Ic n="phone" /></button>
      </div>
      {partner.id ? <div className="cw-safety">
        <button type="button" className="cw-report-btn" onClick={() => setShowReport(true)}>Report</button>
        <button type="button" className="cw-block-btn" onClick={() => setShowBlock(true)}>Block this person</button>
      </div> : null}
      {showReport && <ReportModal person={partner} onClose={() => setShowReport(false)} />}
      {showBlock && <BlockModal person={partner} onClose={() => setShowBlock(false)} onBlocked={() => { setShowBlock(false); endCall(); }} />}
    </div>
  );
}

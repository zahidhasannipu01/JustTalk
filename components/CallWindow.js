'use client';
import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Ic, Avatar } from './icons';
import { api, toast, initials } from '@/lib/toast';
import { ReportModal, BlockModal } from './views/PeopleView';

// Call popup — same markup/classes as the approved preview (.callwin).
// LiveKit connection with crystal-clear defaults: Opus DTX + RED, adaptive stream, dynacast.
export default function CallWindow({ session, me, onClose, onAddPeople }) {
  const [min, setMin] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [spkOn, setSpkOn] = useState(true);
  const [camOn, setCamOn] = useState(session.kind === 'video');
  const [status, setStatus] = useState('Calling…');
  const [secs, setSecs] = useState(0);
  const [rate, setRate] = useState(null); // {call_id, partner} after end when >= 5 min
  const [stars, setStars] = useState({ fluency: 0, speaking: 0, behaviour: 0 });
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [friendSent, setFriendSent] = useState(false);
  const roomRef = useRef(null);
  const winRef = useRef(null);
  const selfVideoRef = useRef(null);
  const remoteRef = useRef(null);
  const startedRef = useRef(Date.now());
  const partner = session.partner || { name: session.title || 'Room', avatar: null };

  useEffect(() => {
    let room;
    (async () => {
      try {
        room = new Room({ adaptiveStream: true, dynacast: true, audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, publishDefaults: { audioPreset: { maxBitrate: 51000 }, dtx: true, red: true, videoEncoding: { maxBitrate: 1700000, maxFramerate: 30 } } });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => { hadRemote = true;
          if (track.kind === Track.Kind.Audio) { const el = track.attach(); el.style.display = 'none'; document.body.appendChild(el); }
          if (track.kind === Track.Kind.Video && remoteRef.current) { track.attach(remoteRef.current); setStatus('Connected'); }
        });
        let hadRemote = false;
        room.on(RoomEvent.ParticipantConnected, () => { hadRemote = true; setStatus('Connected'); });
        room.on(RoomEvent.ParticipantDisconnected, (p2) => {
          // 1:1 call: the partner leaving (signalled over the WebSocket) ends the call here too.
          if (partner.id && p2 && String(p2.identity) === String(partner.id)) { endRef.current && endRef.current(); }
        });
        room.on(RoomEvent.Disconnected, () => setStatus('Call ended'));
        await room.connect(session.url, session.token);
        if (room.remoteParticipants.size > 0) hadRemote = true;
        startedRef.current = Date.now(); setSecs(0);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (session.kind === 'video') await room.localParticipant.setCameraEnabled(true);
        setStatus(session.kind === 'room' ? 'In room' : 'Ringing…');
      } catch (e) { setStatus('Could not connect'); toast('Call could not connect — is the LiveKit server running?'); }
    })();
    const t = setInterval(() => setSecs(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => { clearInterval(t); try { room?.disconnect(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const room = roomRef.current; if (!room) return;
      try {
        if (camOn) { await room.localParticipant.setCameraEnabled(true); const pub = room.localParticipant.getTrackPublication(Track.Source.Camera); if (pub?.track && selfVideoRef.current) pub.track.attach(selfVideoRef.current); }
        else await room.localParticipant.setCameraEnabled(false);
      } catch {}
    })();
  }, [camOn]);

  async function toggleMic() { const room = roomRef.current; if (!room) return; const next = !micOn; setMicOn(next); try { await room.localParticipant.setMicrophoneEnabled(next); } catch {} }
  function toggleSpk() { const next = !spkOn; setSpkOn(next); document.querySelectorAll('audio[data-livekit]').forEach(a => { a.muted = !next; }); document.querySelectorAll('body > audio').forEach(a => { a.muted = !next; }); }

  const endRef = useRef(null);
  async function endCall() {
    try { await roomRef.current?.disconnect(); } catch {}
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

  if (min) return (
    <div className="callmin open" style={{ display: 'flex' }}>
      <Avatar user={partner} size={36} /><span><b>{partner.name}</b><small>{mm}:{ss}</small></span>
      <button type="button" onClick={toggleMic} title="Mute / unmute" aria-label="Mute / unmute"><Ic n="mic" /></button>
      <button type="button" onClick={() => setMin(false)} title="Restore call" aria-label="Restore call"><Ic n="plus" /></button>
      <button type="button" className="endb" onClick={endCall} title="End call" aria-label="End call"><Ic n="phone" /></button>
    </div>
  );

  return (
    <div className="callwin open" ref={winRef} role="dialog" aria-label="Call window" style={{ right: 18, bottom: 18 }}>
      <div className="callwin-head" onPointerDown={onDragStart}><span className="drag-dots">⠿</span>
        <div><b>{partner.name}</b><small>{partner.roomPeople != null ? `Room · ${partner.roomPeople} people` : session.kind === 'video' ? 'Video call' : 'Audio call'} · {mm}:{ss}</small></div>
        <div className="hw">
          <button type="button" title="Minimize" aria-label="Minimize call" onClick={() => setMin(true)}><Ic n="minus" /></button>
          <button type="button" className="endb" title="End call" aria-label="End call" onClick={endCall}><Ic n="phone" /></button>
        </div>
      </div>
      <div className={`call-stage ${status !== 'Connected' ? 'ringing' : ''}`}>
        <div style={{ display: 'grid', justifyItems: 'center' }}>
          <span className="avatar big-av" style={{ background: partner.color || '#0E9594', overflow: 'hidden' }}>{partner.avatar ? <img src={partner.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(partner.name)}</span>
          <div className="status-txt">{status}</div>
          <div className="sub-txt">{session.kind === 'video' ? 'Video call' : 'Audio call'}</div>
          <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', borderRadius: 14, marginTop: 10, display: session.kind === 'video' ? 'block' : 'none' }} />
        </div>
        <div className="cw-selfview" hidden={!camOn}><video ref={selfVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><span>You · camera on</span></div>
      </div>
      <div className="cw-enc"><Ic n="lock" size={14} /><span>Encrypted. Only people in the call can hear you.</span></div>
      <div className="call-controls">
        <button type="button" className={`cc-btn ${!micOn ? 'off' : ''}`} title="Mute microphone" aria-label="Mute microphone" onClick={toggleMic}><Ic n="mic" /></button>
        <button type="button" className={`cc-btn ${!spkOn ? 'off' : ''}`} title="Speaker" aria-label="Toggle speaker" onClick={toggleSpk}><Ic n="speaker" /></button>
        <button type="button" className={`cc-btn cc-video ${camOn ? 'off' : ''}`} title="Turn camera on" aria-label="Turn camera on" onClick={() => setCamOn(c => !c)}><Ic n="video" /></button>
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

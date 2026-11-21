'use client';
import { useEffect, useRef, useState } from 'react';
import { Ic, Avatar } from '../icons';
import { api, toast, colorFor } from '@/lib/toast';
import { socket } from '@/lib/socket';

const EMOJIS = ['😊','😂','😍','👍','🙏','🔥','🎉','❤️','👋','😅','🤔','👏','💯','✨','📚','💬','🎤','☕','🌍','✈️','🤗','👌','😴','🌟'];
const BN_WORDS = ['ami', 'tumi', 'kemon', 'acho', 'bhalo', 'dhonnobad', 'khub', 'ajke', 'kalke', 'khabar', 'bhai', 'apu', 'kotha', 'bolchi', 'shuncho', 'bangla', 'desh', 'ekhon', 'hobe', 'na'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Call-log entries (Messenger-style rows inside the chat) carry a small
// JSON payload: { k: 'audio'|'video', s: 'done'|'missed', d: seconds }.
function parseCallLog(text) { try { const j = JSON.parse(text || ''); if (j && (j.k === 'audio' || j.k === 'video')) return j; } catch {} return null; }
function callLogLabel(j, mine) {
  if (j.s === 'missed') return mine ? `${j.k === 'video' ? 'Video' : 'Audio'} call · No answer` : `Missed ${j.k === 'video' ? 'video' : 'audio'} call`;
  const d = Math.max(0, Math.floor(j.d || 0));
  return `${j.k === 'video' ? 'Video' : 'Audio'} call · ${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
}
function timeLabel(d) {
  if (!d) return '';
  const dt = new Date(d); const now = new Date();
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  if (days <= 0) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (days === 1) return 'Yesterday';
  if (days < 7) return WD[dt.getDay()];
  return dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
function dayLabel(d) {
  const dt = new Date(d); const now = new Date();
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
function lastSeen(d) {
  if (!d) return 'Recently';
  const mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hrs ago`;
  return `${Math.round(mins / 1440)} days ago`;
}
// photo_ref payloads: 'asset:<file>|<caption>' marks the seeded demo photo (a bundled asset);
// real photos are phone-to-phone only — the server never stores an image.
function parsePhoto(text) {
  if (text && text.startsWith('asset:')) { const [f, cap] = text.slice(6).split('|'); return { src: `/assets/${f}`, cap: cap || '' }; }
  return { src: null, cap: text || '' };
}

export default function ChatView({ me, initialPerson, onCall }) {
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState('');
  const [nudge, setNudge] = useState('');
  // `opened` = the user tapped a conversation (mobile shows the chat instead of
  // the list). Kept separate from activeId, which desktop pre-selects.
  const [opened, setOpened] = useState(false);
  const fileRef = useRef(null);
  const msgsRef = useRef(null);
  const activeIdRef = useRef(null);
  const active = convs.find(c => c.id === activeId) || null;

  async function loadConvs() { try { const d = await api('/api/chats'); setConvs(d.conversations); if (!activeIdRef.current && d.conversations[0]) setActiveId(d.conversations[0].id); } catch {} }
  useEffect(() => { loadConvs(); }, []);
  useEffect(() => { if (initialPerson) { (async () => { try { const d = await api('/api/chats', { method: 'POST', body: { user_id: initialPerson.id } }); await loadConvs(); setActiveId(d.id); setOpened(true); } catch (e) { toast(e.message); } })(); } }, [initialPerson]);
  useEffect(() => { activeIdRef.current = activeId; if (activeId) { api(`/api/chats/${activeId}/messages`).then(d => { setMsgs(d.messages); setConvs(cs => cs.map(c => c.id === activeId ? { ...c, unread: 0 } : c)); }).catch(() => {}); } }, [activeId]);
  // Real-time list: a pushed chat-message refreshes latest message + unread at
  // once (and appends into the open conversation); a presence push flips the
  // green dot. Socket reconnect resyncs everything.
  useEffect(() => {
    const offMsg = socket.on('chat-message', m => {
      loadConvs();
      if (m && Number(m.conversation_id) === Number(activeIdRef.current)) api(`/api/chats/${m.conversation_id}/messages`).then(d => setMsgs(d.messages)).catch(() => {});
    });
    const offPres = socket.on('presence', m => {
      if (!m) return;
      setConvs(cs => cs.map(c => (c.other && Number(c.other.id) === Number(m.user_id)) ? { ...c, other: { ...c.other, online: !!m.online } } : c));
    });
    const offOpen = socket.on('_open', () => loadConvs());
    return () => { offMsg(); offPres(); offOpen(); };
  }, []);
  // While a chat is open on mobile the bottom nav steps aside (full-screen chat).
  useEffect(() => {
    document.body.classList.toggle('chat-open', opened);
    return () => document.body.classList.remove('chat-open');
  }, [opened]);
  // Tell the server which conversation is on screen: messages arriving in
  // the chat I am already reading must not become notifications. On desktop
  // the pane is visible whenever a conversation is active; on mobile only
  // once it is opened full-screen.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 901px)').matches;
    socket.send({ t: 'viewing', conversation_id: activeId && (opened || wide) ? activeId : null });
  }, [activeId, opened]);
  useEffect(() => () => { socket.send({ t: 'viewing', conversation_id: null }); }, []);
  useEffect(() => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs]);
  useEffect(() => { const hit = BN_WORDS.find(w => new RegExp(`\\b${w}\\b`, 'i').test(input)); setNudge(hit || ''); }, [input]);

  async function send(e) {
    e.preventDefault(); if (!input.trim() || !activeId) return;
    try { await api(`/api/chats/${activeId}/messages`, { method: 'POST', body: { ciphertext: input.trim() } }); setInput(''); const d = await api(`/api/chats/${activeId}/messages`); setMsgs(d.messages); loadConvs(); }
    catch (err) { toast(err.message); }
  }
  async function sendPhoto(file) {
    if (!file) return;
    // Photos move phone-to-phone only and are never stored on the server: show locally, register only a reference.
    const url = URL.createObjectURL(file);
    setMsgs(m => [...m, { id: `local-${Date.now()}`, sender_id: me.id, kind: 'photo_local', text: url }]);
    try { await api(`/api/chats/${activeId}/messages`, { method: 'POST', body: { kind: 'photo_ref' } }); loadConvs(); } catch (err) { toast(err.message); }
  }
  const shown = convs.filter(c => (c.other?.name || '').toLowerCase().includes(search.toLowerCase()));
  const other = active?.other;
  const media = msgs.filter(m => m.kind === 'photo_ref' || m.kind === 'photo_local');
  return (
    <div className={`chatview ${opened ? 'show-main' : ''}`}>
      <aside className="cv-list">
        <div className="cv-list-top"><b>Chats</b><span>{convs.length} people</span></div>
        <div className="search"><Ic n="search" size={17} /><input type="search" placeholder="Search chats…" aria-label="Search chats" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="cv-convs">
          {shown.map(c => (
            <button type="button" key={c.id} className={`conv ${c.id === activeId ? 'act' : ''}`} onClick={() => { setActiveId(c.id); setOpened(true); }}>
              <span className="av-wrap"><Avatar user={{ ...c.other, color: colorFor(c.other?.id) }} size={44} />{c.other?.online ? <i className="presence" title="Online"></i> : null}</span>
              <span className="cmeta"><b>{c.other?.name}</b><small>{c.last ? (c.last.kind === 'photo_ref' ? 'Photo' : c.last.kind === 'call_log' ? callLogLabel(parseCallLog(c.last.text) || { k: 'audio', s: 'done', d: 0 }, c.last.sender_id === me.id) : (c.last.text || '')) : ''}</small></span>
              {c.unread ? <span className="unread">{c.unread}</span> : <span className="ctime">{timeLabel(c.last?.created_at)}</span>}
            </button>
          ))}
        </div>
        {shown.length === 0 && <p className="cv-empty">No chat matches that name.</p>}
      </aside>
      <section className="cv-main">
        {active && other ? <>
          <header className="cv-head">
            <button type="button" className="cv-back" aria-label="Back to chats" onClick={() => setOpened(false)}>←</button>
            <button type="button" className="cv-id" title="View profile" aria-label="View profile" onClick={() => setDrawer(true)}>
              <span className="av-wrap"><Avatar user={{ ...other, color: colorFor(other.id) }} size={40} />{other.online ? <i className="presence" title="Online"></i> : null}</span>
              <span><b className="cv-name">{other.name}</b><small className="cv-sub">{other.online ? `Online${other.note ? ` · ${other.note}` : ''}` : 'Last seen recently'}</small></span>
            </button>
            <div className="cv-actions">
              <button type="button" className="cv-call-audio" onClick={() => onCall(other, 'audio')} disabled={active.chat_disabled}><Ic n="phone" />Call</button>
              <button type="button" className="cv-call-video video" onClick={() => onCall(other, 'video')} disabled={active.chat_disabled}><Ic n="video" />Video</button>
            </div>
          </header>
          <div className="cv-msgs" ref={msgsRef}>
            {(() => {
              const nodes = []; let prevDay = null;
              for (const m of msgs) {
                const dl = dayLabel(m.created_at || Date.now());
                if (dl !== prevDay) { prevDay = dl; nodes.push(<div className="cv-day" key={`day-${m.id}`}>{dl}</div>); if (nodes.length === 1) nodes.push(<div className="cv-enc" key="enc"><Ic n="lock" size={14} /><span><b>End-to-end encrypted</b></span></div>); }
                const mine = m.sender_id === me.id;
                if (m.kind === 'photo_local') nodes.push(<div key={m.id} className="bubble me has-img"><img className="chat-img" src={m.text} alt="Photo you sent" /></div>);
                else if (m.kind === 'photo_ref') { const ph = parsePhoto(m.text); nodes.push(<div key={m.id} className={`bubble ${mine ? 'me' : 'them'} has-img`}>{ph.src ? <img className="chat-img" src={ph.src} alt={ph.cap ? `Photo — ${ph.cap}` : 'Shared photo'} /> : <span className="img-cap">Photo</span>}{ph.cap ? <span className="img-cap">{ph.cap}</span> : null}</div>); }
                else if (m.kind === 'call_log') { const j = parseCallLog(m.text); nodes.push(<div key={m.id} className={`cv-calllog ${j && j.s === 'missed' && !mine ? 'missed' : ''}`}><span className="cv-calllog-ic"><Ic n={j && j.k === 'video' ? 'video' : 'phone'} size={13} /></span>{j ? callLogLabel(j, mine) : 'Call'}</div>); }
                else nodes.push(<div key={m.id} className={`bubble ${mine ? 'me' : 'them'}`}>{m.text}</div>);
              }
              if (msgs.length === 0) { nodes.push(<div className="cv-day" key="d0">Today</div>); nodes.push(<div className="cv-enc" key="e0"><Ic n="lock" size={14} /><span><b>End-to-end encrypted</b></span></div>); }
              return nodes;
            })()}
          </div>
          {nudge && <div className="eng-nudge"><span className="en-badge">EN</span><span className="en-txt">Talk in English. It will help you.</span><button type="button" className="en-x" aria-label="Dismiss suggestion" onClick={() => setNudge('')}>×</button></div>}
          <form className="cv-form" onSubmit={send}>
            <button type="button" className="cv-tool cv-emoji-btn" aria-label="Add emoji" title="Add emoji" onClick={() => setEmojiOpen(o => !o)}><Ic n="emoji" /></button>
            <button type="button" className="cv-tool cv-img-btn" aria-label="Send a photo" title="Send a photo" onClick={() => fileRef.current?.click()}><Ic n="image" /></button>
            <input type="file" className="cv-file" accept="image/*" hidden ref={fileRef} onChange={e => { sendPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <input className="cv-in" placeholder="Write a message…" aria-label="Message" value={input} onChange={e => setInput(e.target.value)} disabled={active.chat_disabled} />
            <button type="submit" className="cv-send" aria-label="Send message" disabled={active.chat_disabled}><Ic n="send" /></button>
            {emojiOpen && <div className="emoji-panel"><div className="emoji-grid">{EMOJIS.map(em => <button type="button" key={em} onClick={() => setInput(v => v + em)} aria-label={`Add ${em}`}>{em}</button>)}</div></div>}
          </form>
          <div className={`pdrawer-scrim ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)}></div>
          <aside className={`pdrawer ${drawer ? 'open' : ''}`} aria-label="Profile details" aria-hidden={!drawer}>
            <div className="pd-head"><b>Profile</b><button type="button" className="pd-x" aria-label="Close profile" onClick={() => setDrawer(false)}>×</button></div>
            <div className="pd-body">
              <div className="pd-hero"><span className="av-wrap"><Avatar user={{ ...other, color: colorFor(other.id) }} size={72} />{other.online ? <i className="presence" title="Online"></i> : null}</span><b>{other.name}</b><span className={`pd-status ${other.online ? 'on' : 'off'}`}><i></i><span>{other.online ? 'Online now' : 'Offline'}</span></span></div>
              <div className="pd-actions">
                <button type="button" className="pd-call-audio" aria-label="Call" title="Call" onClick={() => onCall(other, 'audio')}><Ic n="phone" /></button>
                <button type="button" className="pd-call-video video" aria-label="Video call" title="Video call" onClick={() => onCall(other, 'video')}><Ic n="video" /></button>
              </div>
              <div className="pd-sec">About</div>
              <div className="pd-row"><span>Status</span><b>{other.online ? 'Online now' : 'Offline'}</b></div>
              <div className="pd-row"><span>Last online</span><b>{other.online ? 'Active now' : lastSeen(other.last_seen_at)}</b></div>
              {other.phone ? <div className="pd-row"><span>Phone</span><b>{other.phone}</b></div> : null}
              {(other.note || other.goal) ? <div className="pd-row"><span>Practising</span><b>{other.note || other.goal}</b></div> : null}
              <div className="pd-row"><span>Encryption</span><b>End-to-end encrypted</b></div>
              {other.rating != null && other.rating_cats ? <><div className="pd-sec">Partner ratings</div><div className="pd-rating"><div className="pd-r-top"><span><b>★ {Number(other.rating).toFixed(1)}</b><small>from {other.ratings_count} partner ratings</small></span><span className="rate-badge">★{Number(other.rating).toFixed(1)}</span></div><div className="pd-r-row"><span>Fluency</span><b>★ {Number(other.rating_cats.fluency).toFixed(1)}</b></div><div className="pd-r-row"><span>Speaking</span><b>★ {Number(other.rating_cats.speaking).toFixed(1)}</b></div><div className="pd-r-row"><span>Behaviour</span><b>★ {Number(other.rating_cats.behaviour).toFixed(1)}</b></div></div></> : null}
              <div className="pd-sec">Media shared</div>
              {media.length ? <div className="pd-media">{media.map(m => { const ph = m.kind === 'photo_local' ? { src: m.text, cap: '' } : parsePhoto(m.text); return ph.src ? <img key={m.id} src={ph.src} alt={ph.cap ? `Shared photo — ${ph.cap}` : 'Shared photo'} loading="lazy" /> : null; })}</div> : <p className="pd-media-empty">No photos shared in this chat yet.</p>}
            </div>
          </aside>
        </> : <div style={{ padding: 28 }}><p className="empty-note">No conversation selected.</p></div>}
      </section>
    </div>
  );
}

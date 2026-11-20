'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ic, Avatar } from './icons';
import CallWindow from './CallWindow';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import PeopleView from './views/PeopleView';
import ChatView from './views/ChatView';
import { ProfileView, SettingsView } from './views/ProfileSettings';
import SubscriptionView from './views/SubscriptionView';
import SupportView from './views/SupportView';
import { api, toast, colorFor, Taka } from '@/lib/toast';

const NAV = [
  ['dashboard', 'home', 'Dashboard'], ['rooms', 'room', 'Room'], ['people', 'people', 'People'],
  ['create', 'plus', 'Create room'], ['chats', 'chat', 'Chats'], ['profile', 'profile', 'Profile'],
  ['subscription', 'card', 'Subscription'], ['support', 'support', 'Support'],
];
const HONORIFIC = /^(md|mohammad|mohammed|mst|md\.)$/i;
function displayName(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length > 1 && HONORIFIC.test(parts[0].replace('.', ''))) return parts[1];
  return parts[0] || '';
}
function ntTime(d) {
  const t = new Date(d); const now = new Date();
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'Yesterday';
  return t.toLocaleDateString('en-GB', { weekday: 'short' });
}
function NtItem({ icon, title, body, time, unread, missed }) {
  return (
    <div className="nt-item">
      {icon}
      <span className="nt-meta"><span className="nt-top"><b>{title}</b><span className="nt-time">{time}</span></span><small className={missed ? 'nt-missed' : ''}>{body}</small></span>
      {unread ? <i className="nt-dot"></i> : null}
    </div>
  );
}

export default function AppShell({ initialUser }) {
  const [view, setView] = useState('dashboard');
  const [me, setMe] = useState(initialUser);
  const [dash, setDash] = useState(null);
  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [subData, setSubData] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [openTickets, setOpenTickets] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [call, setCall] = useState(null);
  const [blockedPerson, setBlockedPerson] = useState(null);
  const [chatPerson, setChatPerson] = useState(null);
  const [reminderNotif, setReminderNotif] = useState(null);
  const [consent, setConsent] = useState(false);
  const [passRoom, setPassRoom] = useState(null);
  const [passErr, setPassErr] = useState(false);
  const pollRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [m, d, p, r, s, n, t] = await Promise.all([api('/api/me'), api('/api/dashboard'), api('/api/people'), api('/api/rooms'), api('/api/packages'), api('/api/notifications'), api('/api/tickets')]);
      setMe(m.user); setDash(d); setPeople(p.people); setRequests(p.requests); setRooms(r.rooms); setSubData(s); setNotifs(n.notifications);
      setOpenTickets((t.tickets || []).filter(x => x.status !== 'resolved').length);
      const rem = n.notifications.find(x => x.kind === 'subscription_reminder' && !x.is_read);
      if (rem) setReminderNotif(rem);
    } catch {}
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  function go(v) {
    if (v === 'create') { setCreateOpen(true); return; }
    const wipe = document.getElementById('page-wipe');
    if (wipe) { wipe.classList.remove('run'); void wipe.offsetWidth; wipe.classList.add('run'); setTimeout(() => wipe.classList.remove('run'), 1150); }
    setView(v); setMenuOpen(false); setTrayOpen(false); setMoreOpen(false);
  }
  async function logout() { try { await api('/api/auth/logout', { method: 'POST' }); } catch {} window.location.href = '/login'; }

  async function startDirectCall(person, kind) {
    try {
      const d = await api('/api/calls/token', { method: 'POST', body: { user_id: person.id, kind } });
      if (d.blocked) { setBlockedPerson(person); return; }
      setCall({ ...d, kind, partner: { ...person, color: person.color || colorFor(person.id) } });
    } catch (e) { toast(e.message); }
  }
  async function startMatch(gender, kind) {
    try {
      const d = await api('/api/calls/match', { method: 'POST', body: { gender, kind } });
      if (d.waiting) {
        toast('Looking for a partner…');
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try { const r = await api('/api/calls/match', { method: 'POST', body: { gender, kind } }); if (!r.waiting) { clearInterval(pollRef.current); setCall({ ...r, kind, matched: true, partner: { ...r.partner, color: r.partner.color || colorFor(r.partner.id) } }); } } catch {}
        }, 4000);
        setTimeout(() => clearInterval(pollRef.current), 120000);
        return;
      }
      setCall({ ...d, kind, matched: true, partner: { ...d.partner, color: d.partner.color || colorFor(d.partner.id) } });
    } catch (e) { toast(e.message); }
  }
  function openStartCalling() {
    const plan = subData?.packages?.find(p => p.id === subData?.subscription?.package_id);
    if (plan?.ai_reports && me?.ai_reports_optin === null) { setConsent(true); return; }
    setMatchOpen(true);
  }
  async function joinRoom(room, password, kind) {
    if (room.visibility === 'private' && password === undefined) { setPassRoom(room); setPassErr(false); return; }
    try {
      const d = await api('/api/rooms/join', { method: 'POST', body: { room_id: room.id, password } });
      setPassRoom(null);
      setCall({ ...d, kind: kind === 'audio' ? 'audio' : 'video', partner: { name: room.title, avatar: null, roomPeople: room.speaking } });
    } catch (e) {
      if (room.visibility === 'private' && password !== undefined) { setPassErr(true); setPassRoom(room); }
      else toast(e.message);
    }
  }
  const unread = notifs.filter(n => !n.is_read).length;
  const onlineFriends = people.filter(p => p.online);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const curPlan = subData?.packages?.find(p => p.id === subData?.subscription?.package_id);
  const payNotifs = notifs.filter(n => n.kind === 'subscription_reminder');
  const missedNotifs = notifs.filter(n => n.kind === 'missed_call');
  const msgNotifs = notifs.filter(n => n.kind === 'message');
  const otherNotifs = notifs.filter(n => !['subscription_reminder', 'missed_call', 'message'].includes(n.kind));

  return (
    <div className="app-root">
      <div className="desk-app">
        <aside className="sidebar">
          <div className="logo">talk<i>.</i></div>
          <nav className="nav">
            {NAV.map(([v, ic, label]) => (
              <a key={v} className={view === v ? 'act' : ''} onClick={() => go(v)}><Ic n={ic} />{label}{v === 'subscription' && subData?.subscription ? <span className="sub-nav-badge">{subData.subscription.plan_name}</span> : null}{v === 'support' && openTickets ? <span className="nav-badge">{openTickets} open</span> : null}</a>
            ))}
          </nav>
          <div className="side-label">Friends online</div>
          <div className="online-mini">
            {onlineFriends.map(p => (
              <a key={p.id} onClick={() => startDirectCall(p, 'audio')}><span className="av-wrap"><Avatar user={p} size={34} /><i className="presence" title="Online"></i></span><span><b>{p.name}</b><small>Online</small></span><span className="call-ic"><Ic n="phone" size={14} /></span></a>
            ))}
            {onlineFriends.length === 0 && <p className="empty-note" style={{ padding: '2px 10px' }}>No friends online right now.</p>}
          </div>
        </aside>
        <div>
          <div className="app-topbar">
            <button className="bell-btn" type="button" aria-label="Notifications" aria-expanded={trayOpen} onClick={() => { setTrayOpen(o => !o); setMenuOpen(false); }}><Ic n="bell" />{unread ? <span className="bell-badge">{unread}</span> : null}</button>
            <button className="me" type="button" title="Profile menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen(o => !o); setTrayOpen(false); }}>{me?.avatar ? <img src={me.avatar} alt="" /> : (me?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</button>
          </div>
          <div className="center" style={{ paddingTop: 8 }}>
            <div className="center-top"><div><div className="hi js-greeting">{greeting}, {displayName(me?.name)}</div><h3>Ready to practise?</h3></div><span className="live-pill"><i></i><span>{dash?.live_now || 0} live now</span></span></div>
            {view === 'dashboard' && <DashboardView me={me} dash={dash} onStartCalling={openStartCalling} />}
            {view === 'rooms' && <RoomsView rooms={rooms} onJoin={joinRoom} onOpenPeople={() => go('people')} onOpenCreate={() => setCreateOpen(true)} />}
            {view === 'people' && <PeopleView people={people} requests={requests} reload={loadAll} onCall={startDirectCall} onChat={p => { setChatPerson(p); go('chats'); }} />}
            {view === 'chats' && <ChatView me={me} initialPerson={chatPerson} onCall={startDirectCall} />}
            {view === 'profile' && <ProfileView me={me} dash={dash} people={people} onCall={startDirectCall} onLogout={logout} />}
            {view === 'settings' && <SettingsView me={me} subData={subData} reload={loadAll} />}
            {view === 'subscription' && <SubscriptionView data={subData} reload={loadAll} />}
            {view === 'support' && <SupportView />}
          </div>
        </div>
      </div>

      <nav className="bottomnav">
        {[['dashboard', 'home', 'Dashboard'], ['rooms', 'room', 'Rooms'], ['people', 'people', 'People'], ['chats', 'chat', 'Chats']].map(([v, ic, label]) => (
          <button type="button" key={v} className={view === v ? 'act' : ''} onClick={() => go(v)}><Ic n={ic} />{label}</button>
        ))}
        <button type="button" className={moreOpen ? 'act' : ''} onClick={() => setMoreOpen(true)}><Ic n="plus" />More</button>
      </nav>
      <div className={`m-scrim ${moreOpen ? 'show' : ''}`} onClick={() => setMoreOpen(false)} style={{ position: 'fixed' }}></div>
      <div className={`m-drawer ${moreOpen ? 'open' : ''}`} style={{ position: 'fixed' }}>
        <div className="m-grab-zone"><div className="m-grab"></div></div>
        <div className="m-drawer-head"><b>More</b><button type="button" className="m-close" aria-label="Close" onClick={() => setMoreOpen(false)}>×</button></div>
        <div className="m-rows">
          {[['create', 'plus', 'Create room'], ['profile', 'profile', 'My profile'], ['settings', 'settings', 'Settings'], ['subscription', 'card', 'Subscription'], ['support', 'support', 'Support']].map(([v, ic, label]) => (
            <button type="button" className="m-row" key={v} onClick={() => go(v)}><span className="m-row-ic"><Ic n={ic} /></span><span className="m-row-txt"><b>{label}</b></span><span className="chev">›</span></button>
          ))}
          <button type="button" className="m-row" onClick={logout}><span className="m-row-ic"><Ic n="logout" /></span><span className="m-row-txt"><b>Log out</b></span><span className="chev">›</span></button>
        </div>
      </div>

      {menuOpen && (
        <div className="profile-menu" style={{ top: 58, right: 16 }}>
          <div className="pm-head"><Avatar user={{ ...me, color: '#101210' }} size={44} /><span><b>{me?.name}</b><small>@{me?.username}</small></span></div>
          {[['dashboard', 'home', 'Dashboard'], ['profile', 'profile', 'My profile'], ['chats', 'chat', 'Chats'], ['settings', 'settings', 'Settings']].map(([v, ic, label]) => (
            <button type="button" className="pm-item" key={v} onClick={() => go(v)}><Ic n={ic} />{label}</button>
          ))}
          <button type="button" className="pm-item pm-logout" onClick={logout}><Ic n="logout" />Log out</button>
        </div>
      )}
      {trayOpen && (
        <div className="notif-tray" style={{ top: 58, right: 16 }}>
          <div className="nt-head"><b>Notifications</b><button type="button" className="nt-clear" onClick={async () => { await api('/api/notifications', { method: 'POST' }); setReminderNotif(null); loadAll(); }}>Mark all read</button></div>
          <div>
            {payNotifs.length > 0 && <><div className="nt-sec">Payments</div>{payNotifs.map(n => (
              <NtItem key={n.id} icon={<span className="avatar" style={{ background: "var(--green)" }}><Taka>৳</Taka></span>} title="Payment reminder" body={n.body} time="Auto" unread={!n.is_read} />
            ))}</>}
            {missedNotifs.length > 0 && <><div className="nt-sec">Missed calls</div>{missedNotifs.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.actor_name || n.title} body="Missed call" time={ntTime(n.created_at)} unread={!n.is_read} missed />
            ))}</>}
            {msgNotifs.length > 0 && <><div className="nt-sec">Messages</div>{msgNotifs.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.actor_name || n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
            ))}</>}
            {otherNotifs.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
            ))}
            {notifs.length === 0 && <p className="nt-empty">No notifications.</p>}
          </div>
        </div>
      )}

      {matchOpen && <MatchModal onClose={() => setMatchOpen(false)} onGo={g => { setMatchOpen(false); startMatch(g, 'audio'); }} />}
      {consent && (
        <div className="overlay open" role="dialog" aria-modal="true" aria-label="AI reports"><div className="modal">
          <div className="modal-head"><div><h3>AI {curPlan?.ai_report_frequency === 'weekly' ? 'weekly' : 'daily'} reports</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setConsent(false)}>×</button></div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.55 }}>Your {curPlan?.name} plan includes {curPlan?.ai_report_frequency === 'weekly' ? 'a weekly' : 'a daily'} report on your own speaking — fluency, grammar, vocabulary and what to improve. Turn it on?</p>
          <div className="modal-actions">
            <button type="button" className="btn-soft" style={{ flex: 1 }} onClick={async () => { await api('/api/me', { method: 'PATCH', body: { ai_reports_optin: false } }); setConsent(false); setMatchOpen(true); loadAll(); }}>No, keep it off</button>
            <button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={async () => { await api('/api/me', { method: 'PATCH', body: { ai_reports_optin: true } }); setConsent(false); setMatchOpen(true); loadAll(); }}>Yes, send my reports</button>
          </div>
        </div></div>
      )}
      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} onCreated={async (id, kind, pw) => { setCreateOpen(false); const r = await api('/api/rooms'); setRooms(r.rooms); const room = r.rooms.find(x => x.id === id); if (room) joinRoom(room, pw, kind); loadAll(); }} />}
      {passRoom && (
        <div className="overlay open" role="dialog" aria-modal="true" aria-label="Room password"><div className="modal">
          <div className="modal-head"><div><h3>{passRoom.title}</h3><p>This room is private — enter its password to join.</p></div><button className="x" type="button" aria-label="Close" onClick={() => setPassRoom(null)}>×</button></div>
          <form onSubmit={e => { e.preventDefault(); const pw = new FormData(e.target).get('pw'); joinRoom(passRoom, String(pw || '')); }}>
            <div className="field"><label>Room password</label><input name="pw" type="password" placeholder="Enter the room password" autoComplete="off" /></div>
            {passErr ? <p className="pass-err">That password is not right — check it and try again.</p> : null}
            <div className="modal-actions"><button type="button" className="btn-soft" onClick={() => setPassRoom(null)}>Cancel</button><button type="submit" className="btn-accent2">Join room →</button></div>
          </form>
        </div></div>
      )}
      {blockedPerson && (
        <div className="overlay open" role="dialog" aria-modal="true" aria-label="Blocked"><div className="modal">
          <div className="modal-head"><div><h3>Blocked</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setBlockedPerson(null)}>×</button></div>
          <div className="block-hero"><Avatar user={blockedPerson} size={54} /><span><b>{blockedPerson.name}</b><small>{blockedPerson.note || 'This person has blocked you, so you can’t call or message them.'}</small></span></div>
          <div className="modal-actions"><button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={() => setBlockedPerson(null)}>Got it</button></div>
        </div></div>
      )}
      {reminderNotif && (() => {
        const m = /(\S+) renewal ৳(\d+) was due yesterday/.exec(reminderNotif.body || '');
        const planName = m ? m[1] : (curPlan?.name || 'Plus');
        const price = m ? m[2] : (curPlan?.price_taka ?? '');
        const overdue = !!m;
        return (
          <div className="overlay open" role="dialog" aria-modal="true" aria-label="Payment reminder"><div className="modal">
            <div className="modal-head"><div><h3>{overdue ? 'Your payment is overdue' : 'A quick payment reminder'}</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setReminderNotif(null)}>×</button></div>
            <div className="block-hero"><span className="avatar" style={{ background: "var(--green)" }}><Taka>৳</Taka></span><span><b>{planName} plan — <Taka>৳</Taka>{price} / month</b><small>{overdue ? 'Renewal was due yesterday · still unpaid' : reminderNotif.body}</small></span><span className={`pay-badge ${overdue ? 'overdue' : 'due'}`}>{overdue ? 'Overdue' : 'Due soon'}</span></div>
            <div className="modal-actions">
              <button type="button" className="btn-soft" onClick={() => setReminderNotif(null)}>Not now</button>
              <button type="button" className="btn-dark" onClick={() => setReminderNotif(null)}>I’ve already paid</button>
              <button type="button" className="btn-accent2" onClick={() => { setReminderNotif(null); go('subscription'); }}>Go to Subscription →</button>
            </div>
          </div></div>
        );
      })()}
      {call && <CallWindow session={call} me={me} onClose={() => { setCall(null); loadAll(); }} onAddPeople={() => go('people')} />}
    </div>
  );
}

function MatchModal({ onClose, onGo }) {
  const [gender, setGender] = useState('any');
  const [counts, setCounts] = useState(null);
  useEffect(() => { (async () => { try { const d = await api('/api/calls/match'); setCounts(d.counts); } catch {} })(); }, []);
  const n = counts ? (gender === 'any' ? counts.any : counts[gender]) : null;
  return (
    <div className="overlay open" role="dialog" aria-modal="true" aria-label="Start calling"><div className="modal">
      <div className="modal-head"><div><h3>Start calling</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="field"><label>Partner gender</label>
        <div className="chips" id="match-gender-chips">
          <button type="button" className={gender === 'any' ? 'on' : ''} onClick={() => setGender('any')}>Anyone</button>
          <button type="button" className={gender === 'female' ? 'on' : ''} onClick={() => setGender('female')}><span className="g-ic g-f"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5" /><path d="M12 14v7M8.5 17.5h7" /></svg></span>Female</button>
          <button type="button" className={gender === 'male' ? 'on' : ''} onClick={() => setGender('male')}><span className="g-ic g-m"><svg viewBox="0 0 24 24"><circle cx="10" cy="14" r="5" /><path d="M13.6 10.4 19 5M14.6 5H19v4.4" /></svg></span>Male</button>
        </div>
      </div>
      <p className="field-note" style={{ margin: '2px 0 14px' }}>{n != null ? `${n} matches online` : ' '}</p>
      <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="button" className="btn-accent2" onClick={() => onGo(gender)}>Start calling</button></div>
    </div></div>
  );
}

function CreateRoomModal({ onClose, onCreated }) {
  const [title, setTitle] = useState(''); const [topic, setTopic] = useState(''); const [vis, setVis] = useState('public'); const [password, setPassword] = useState(''); const [kind, setKind] = useState('Audio + Video');
  async function submit(e) {
    e.preventDefault();
    try { const d = await api('/api/rooms', { method: 'POST', body: { title, topic, visibility: vis, password } }); toast('Room created'); onCreated(d.id, kind === 'Audio only' ? 'audio' : 'video', vis === 'private' ? password : undefined); }
    catch (err) { toast(err.message); }
  }
  return (
    <div className="overlay open" role="dialog" aria-modal="true" aria-label="Create room"><div className="modal">
      <div className="modal-head"><div><h3>Create a room</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <form onSubmit={submit}>
        <div className="field"><label>Room title</label><input placeholder="Room title" required value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="field"><label>What will you talk about?</label><textarea placeholder="Description" value={topic} onChange={e => setTopic(e.target.value)} /></div>
        <div className="field"><label>Room type</label><select value={kind} onChange={e => setKind(e.target.value)}><option>Audio + Video</option><option>Audio only</option><option>Video only</option></select></div>
        <div className="field"><label>Who can join?</label><div className="chips"><button type="button" className={vis === 'public' ? 'on' : ''} onClick={() => setVis('public')}>Public</button><button type="button" className={vis === 'private' ? 'on' : ''} onClick={() => setVis('private')}>Private</button></div></div>
        {vis === 'private' && <div className="field"><label>Room password</label><input type="password" placeholder="Room password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>}
        <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="submit" className="btn-accent2">Create &amp; join room →</button></div>
      </form>
    </div></div>
  );
}

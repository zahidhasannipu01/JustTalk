'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ic, Avatar } from './icons';
import Overlay from './Overlay';
import CallWindow from './CallWindow';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import PeopleView from './views/PeopleView';
import ChatView from './views/ChatView';
import { ProfileView, SettingsView } from './views/ProfileSettings';
import SubscriptionView from './views/SubscriptionView';
import SupportView from './views/SupportView';
import NotificationsView from './views/NotificationsView';
import { api, toast, colorFor, Taka } from '@/lib/toast';
import { socket } from '@/lib/socket';

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
function NtItem({ icon, title, body, time, unread, missed, onClick }) {
  return (
    <div className="nt-item" onClick={onClick} role={onClick ? 'button' : undefined} style={onClick ? { cursor: 'pointer' } : undefined}>
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
  const [everyone, setEveryone] = useState([]);
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
  const [incoming, setIncoming] = useState(null);
  const callRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [m, d, p, r, s, n, t] = await Promise.all([api('/api/me'), api('/api/dashboard'), api('/api/people'), api('/api/rooms'), api('/api/packages'), api('/api/notifications'), api('/api/tickets')]);
      setMe(m.user); setDash(d); setPeople(p.people); setEveryone(p.everyone || p.people); setRequests(p.requests); setRooms(r.rooms); setSubData(s); setNotifs(n.notifications);
      setOpenTickets((t.tickets || []).filter(x => x.status !== 'resolved').length);
      const rem = n.notifications.find(x => x.kind === 'subscription_reminder' && !x.is_read);
      if (rem) {
        // Real state only: if the user currently holds an active paid plan,
        // or has already paid manually and is waiting for approval, the
        // reminder is stale — never show it, and clear it server-side.
        const sub = s.subscription;
        const activePaid = sub && Number(sub.price_taka) > 0 && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now());
        if (activePaid || s.pending_payment) {
          api('/api/notifications', { method: 'POST', body: { kind: 'subscription_reminder' } }).catch(() => {});
          setNotifs(n.notifications.map(x => x.kind === 'subscription_reminder' ? { ...x, is_read: 1 } : x));
        } else setReminderNotif(rem);
      }
    } catch {}
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { callRef.current = call; }, [call]);

  // One socket for everything live: my presence IS the connection, and
  // incoming calls arrive as pushes — no polling anywhere in the app.
  useEffect(() => {
    socket.connect();
    const offIn = socket.on('incoming-call', m => {
      const cur = callRef.current;
      if (cur && cur.phase !== 'searching') return; // already in a call — busy
      setIncoming(prev => prev || { call_id: m.call_id, room_name: m.room_name, kind: m.kind, from_match: !!m.from_match, partner: { ...m.partner, color: m.partner?.color || colorFor(m.partner?.id) } });
    });
    const offCancel = socket.on('call-cancelled', m => setIncoming(prev => (prev && prev.call_id === m.call_id ? null : prev)));
    // Friends' green dots are live: a presence push flips the person's online
    // flag in place (sidebar Friends online + People page) — no refetch.
    const offPres = socket.on('presence', m => {
      if (!m) return;
      setPeople(ps => ps.map(p => Number(p.id) === Number(m.user_id) ? { ...p, online: !!m.online } : p));
    });
    // A pushed notification (friend request, acceptance, message…) refreshes
    // the bell, the tray and the People requests at once.
    const offNotif = socket.on('notification', () => loadAll());
    // The "live now" count is pushed by the server the moment it changes —
    // both the top pill and the Start-calling card read dash.live_now.
    const offLive = socket.on('live-count', m => { if (m && typeof m.count === 'number') setDash(d => (d ? { ...d, live_now: m.count } : d)); });
    return () => { offIn(); offCancel(); offPres(); offNotif(); offLive(); };
  }, []);

  async function answerIncoming(accept) {
    const inc = incoming; if (!inc) return;
    setIncoming(null);
    try {
      await api('/api/calls/answer', { method: 'POST', body: { call_id: inc.call_id, action: accept ? 'accept' : 'decline' } });
      if (accept) setCall({ phase: 'live', call_id: inc.call_id, room_name: inc.room_name, kind: inc.kind, matched: inc.from_match, partner: inc.partner });
    } catch (e) { toast(e.message); }
  }

  function closeCall() {
    if (call?.phase === 'searching') api('/api/calls/match', { method: 'DELETE' }).catch(() => {});
    setCall(null); loadAll();
  }

  function go(v) {
    if (v === 'create') { setCreateOpen(true); return; }
    const wipe = document.getElementById('page-wipe');
    if (wipe) { wipe.classList.remove('run'); void wipe.offsetWidth; wipe.classList.add('run'); setTimeout(() => wipe.classList.remove('run'), 1150); }
    setView(v); setMenuOpen(false); setTrayOpen(false); setMoreOpen(false);
  }
  async function logout() { try { await api('/api/auth/logout', { method: 'POST' }); } catch {} window.location.href = '/login'; }

  // Every reminder-popup action marks the reminder read so it does not
  // reappear on the next load.
  async function dismissReminder() {
    setReminderNotif(null);
    setNotifs(ns => ns.map(x => x.kind === 'subscription_reminder' ? { ...x, is_read: 1 } : x));
    try { await api('/api/notifications', { method: 'POST', body: { kind: 'subscription_reminder' } }); } catch {}
  }
  async function switchToFree() {
    try { await api('/api/subscription/switch-free', { method: 'POST' }); } catch {}
    await dismissReminder();
    loadAll();
  }

  // A clicked message notification opens that very conversation, and marks
  // that sender's message notifications read.
  async function openChatFromNotif(n) {
    if (!n?.actor_id) return;
    setTrayOpen(false);
    try { await api('/api/notifications', { method: 'POST', body: { actor_id: n.actor_id } }); } catch {}
    setChatPerson({ id: n.actor_id, name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) });
    go('chats'); loadAll();
  }

  async function startDirectCall(person, kind) {
    try {
      const d = await api('/api/calls/token', { method: 'POST', body: { user_id: person.id, kind } });
      if (d.blocked) { setBlockedPerson(person); return; }
      setCall({ phase: 'ringing', ...d, kind, partner: { ...person, color: person.color || colorFor(person.id) } });
    } catch (e) { toast(e.message); }
  }
  async function startMatch(gender, kind) {
    try {
      const d = await api('/api/calls/match', { method: 'POST', body: { gender, kind } });
      if (d.waiting) { setCall({ phase: 'searching', gender, kind, partner: null }); return; }
      const partner = { ...d.partner, color: d.partner.color || colorFor(d.partner.id) };
      if (d.phase === 'live') { setCall({ phase: 'live', ...d, kind, matched: true, partner }); return; }
      setCall({ phase: 'ringing', ...d, kind, matched: true, partner });
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
  const reqNotifs = notifs.filter(n => n.kind === 'friend_request' || n.kind === 'friend_accepted');
  const msgNotifs = notifs.filter(n => n.kind === 'message');
  const otherNotifs = notifs.filter(n => !['subscription_reminder', 'missed_call', 'message', 'friend_request', 'friend_accepted'].includes(n.kind));
  // The bell tray is a preview — at most 10 rows across all sections. The full
  // list lives on the Notifications page, one "See all" away.
  let ntBudget = 10;
  const ntTake = arr => { const s = arr.slice(0, Math.max(0, ntBudget)); ntBudget -= s.length; return s; };
  const payShown = ntTake(payNotifs);
  const missedShown = ntTake(missedNotifs);
  const reqShown = ntTake(reqNotifs);
  const msgShown = ntTake(msgNotifs);
  const otherShown = ntTake(otherNotifs);
  const ntShownCount = payShown.length + missedShown.length + reqShown.length + msgShown.length + otherShown.length;

  return (
    <div className={`app-root ${trayOpen ? 'nt-open' : ''}`}>
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
        <div className="main-col">
          <div className="app-topbar">
            <button className="bell-btn" type="button" aria-label="Notifications" aria-expanded={trayOpen} onClick={() => { setTrayOpen(o => !o); setMenuOpen(false); }}><Ic n="bell" />{unread ? <span className="bell-badge">{unread}</span> : null}</button>
            <button className="me" type="button" title="Profile menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen(o => !o); setTrayOpen(false); }}>{me?.avatar ? <img src={me.avatar} alt="" /> : (me?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</button>
          </div>
          <div className={`center ${view === 'chats' ? 'center-fixed' : ''}`} style={{ paddingTop: 8 }}>
            <div className="center-top"><div><div className="hi js-greeting">{greeting}, {displayName(me?.name)}</div><h3>Ready to practise?</h3></div><span className="live-pill"><i></i><span>{dash?.live_now || 0} live now</span></span></div>
            {view === 'dashboard' && <DashboardView me={me} dash={dash} onStartCalling={openStartCalling} />}
            {view === 'rooms' && <RoomsView rooms={rooms} onJoin={joinRoom} onOpenPeople={() => go('people')} onOpenCreate={() => setCreateOpen(true)} />}
            {view === 'people' && <PeopleView people={people} everyone={everyone} requests={requests} reload={loadAll} onCall={startDirectCall} onChat={p => { setChatPerson(p); go('chats'); }} />}
            {view === 'chats' && <ChatView me={me} initialPerson={chatPerson} onCall={startDirectCall} />}
            {view === 'profile' && <ProfileView me={me} dash={dash} people={people} onCall={startDirectCall} onLogout={logout} />}
            {view === 'settings' && <SettingsView me={me} subData={subData} reload={loadAll} />}
            {view === 'subscription' && <SubscriptionView data={subData} reload={loadAll} />}
            {view === 'support' && <SupportView />}
            {view === 'notifications' && <NotificationsView notifs={notifs} onMarkAllRead={async () => { await api('/api/notifications', { method: 'POST' }); setReminderNotif(null); loadAll(); }} onOpenPeople={() => go('people')} onOpenChat={openChatFromNotif} />}
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
      <div className={`nt-scrim ${trayOpen ? 'show' : ''}`} onClick={() => setTrayOpen(false)}></div>
      {(
        <div className={`notif-tray ${trayOpen ? 'open' : ''}`}>
          <div className="nt-head"><b>Notifications</b><button type="button" className="nt-clear" onClick={async () => { await api('/api/notifications', { method: 'POST' }); setReminderNotif(null); loadAll(); }}>Mark all read</button></div>
          <div>
            {payShown.length > 0 && <><div className="nt-sec">Payments</div>{payShown.map(n => (
              <NtItem key={n.id} icon={<span className="avatar" style={{ background: "var(--green)" }}><Taka>৳</Taka></span>} title="Payment reminder" body={n.body} time="Auto" unread={!n.is_read} />
            ))}</>}
            {missedShown.length > 0 && <><div className="nt-sec">Missed calls</div>{missedShown.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.actor_name || n.title} body="Missed call" time={ntTime(n.created_at)} unread={!n.is_read} missed />
            ))}</>}
            {reqShown.length > 0 && <><div className="nt-sec">Friend requests</div>{reqShown.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.actor_name || n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
            ))}</>}
            {msgShown.length > 0 && <><div className="nt-sec">Messages</div>{msgShown.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.actor_name || n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} onClick={() => openChatFromNotif(n)} />
            ))}</>}
            {otherShown.map(n => (
              <NtItem key={n.id} icon={<Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />} title={n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
            ))}
            {notifs.length === 0 && <p className="nt-empty">No notifications.</p>}
            {notifs.length > ntShownCount && <button type="button" className="nt-seeall" onClick={() => { setTrayOpen(false); go('notifications'); }}>See all notifications</button>}
          </div>
        </div>
      )}

      {matchOpen && <MatchModal onClose={() => setMatchOpen(false)} onGo={g => { setMatchOpen(false); startMatch(g, 'audio'); }} />}
      {consent && (
        <Overlay label="AI reports"><div className="modal">
          <div className="modal-head"><div><h3>AI {curPlan?.ai_report_frequency === 'weekly' ? 'weekly' : 'daily'} reports</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setConsent(false)}>×</button></div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.55 }}>Your {curPlan?.name} plan includes {curPlan?.ai_report_frequency === 'weekly' ? 'a weekly' : 'a daily'} report on your own speaking — fluency, grammar, vocabulary and what to improve. Turn it on?</p>
          <div className="modal-actions">
            <button type="button" className="btn-soft" style={{ flex: 1 }} onClick={async () => { await api('/api/me', { method: 'PATCH', body: { ai_reports_optin: false } }); setConsent(false); setMatchOpen(true); loadAll(); }}>No, keep it off</button>
            <button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={async () => { await api('/api/me', { method: 'PATCH', body: { ai_reports_optin: true } }); setConsent(false); setMatchOpen(true); loadAll(); }}>Yes, send my reports</button>
          </div>
        </div></Overlay>
      )}
      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} onCreated={async (id, kind, pw) => { setCreateOpen(false); const r = await api('/api/rooms'); setRooms(r.rooms); const room = r.rooms.find(x => x.id === id); if (room) joinRoom(room, pw, kind); loadAll(); }} />}
      {passRoom && (
        <Overlay label="Room password"><div className="modal">
          <div className="modal-head"><div><h3>{passRoom.title}</h3><p>This room is private — enter its password to join.</p></div><button className="x" type="button" aria-label="Close" onClick={() => setPassRoom(null)}>×</button></div>
          <form onSubmit={e => { e.preventDefault(); const pw = new FormData(e.target).get('pw'); joinRoom(passRoom, String(pw || '')); }}>
            <div className="field"><label>Room password</label><input name="pw" type="password" placeholder="Enter the room password" autoComplete="off" /></div>
            {passErr ? <p className="pass-err">That password is not right — check it and try again.</p> : null}
            <div className="modal-actions"><button type="button" className="btn-soft" onClick={() => setPassRoom(null)}>Cancel</button><button type="submit" className="btn-accent2">Join room →</button></div>
          </form>
        </div></Overlay>
      )}
      {blockedPerson && (
        <Overlay label="Blocked"><div className="modal">
          <div className="modal-head"><div><h3>Blocked</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setBlockedPerson(null)}>×</button></div>
          <div className="block-hero"><Avatar user={blockedPerson} size={54} /><span><b>{blockedPerson.name}</b><small>{blockedPerson.note || 'This person has blocked you, so you can’t call or message them.'}</small></span></div>
          <div className="modal-actions"><button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={() => setBlockedPerson(null)}>Got it</button></div>
        </div></Overlay>
      )}
      {reminderNotif && (() => {
        const m = /(\S+) renewal ৳(\d+) was due yesterday/.exec(reminderNotif.body || '');
        const planName = m ? m[1] : (curPlan?.name || 'Plus');
        const price = m ? m[2] : (curPlan?.price_taka ?? '');
        const overdue = !!m;
        return (
          <Overlay label="Payment reminder"><div className="modal pay-modal">
            <div className="modal-head"><div><h3>{overdue ? 'Your payment is overdue' : 'A quick payment reminder'}</h3></div><button className="x" type="button" aria-label="Close" onClick={() => setReminderNotif(null)}>×</button></div>
            <div className="block-hero"><span className="avatar" style={{ background: "var(--green)" }}><Taka>৳</Taka></span><span><b>{planName} plan — <Taka>৳</Taka>{price} / month</b><small>{overdue ? 'Renewal was due yesterday · still unpaid' : reminderNotif.body}</small></span><span className={`pay-badge ${overdue ? 'overdue' : 'due'}`}>{overdue ? 'Overdue' : 'Due soon'}</span></div>
            <div className="modal-actions pay-actions">
              <button type="button" className="btn-soft" onClick={dismissReminder}><Ic n="bell" size={16} />Not now</button>
              <button type="button" className="btn-dark" onClick={async () => { await dismissReminder(); go('subscription'); }}><Ic n="card" size={16} />Pay now</button>
              <button type="button" className="btn-accent2" onClick={switchToFree}><Ic n="check" size={16} />Switch to free tier</button>
            </div>
          </div></Overlay>
        );
      })()}
      {incoming && (
        <Overlay label="Incoming call"><div className="modal">
          <div className="modal-head"><div><h3>Incoming call</h3></div></div>
          <div className="block-hero"><Avatar user={incoming.partner} size={54} /><span><b>{incoming.partner.name}</b><small>wants to talk with you</small></span></div>
          <div className="modal-actions"><button type="button" className="btn-soft" onClick={() => answerIncoming(false)}>Decline</button><button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={() => answerIncoming(true)}>Accept</button></div>
        </div></Overlay>
      )}
      {call && <CallWindow key={call.call_id || 'searching'} session={call} me={me} onClose={closeCall} onAddPeople={() => go('people')} />}
    </div>
  );
}

function MatchModal({ onClose, onGo }) {
  const [gender, setGender] = useState('any');
  const [counts, setCounts] = useState(null);
  useEffect(() => { (async () => { try { const d = await api('/api/calls/match'); setCounts(d.counts); } catch {} })(); }, []);
  const n = counts ? (gender === 'any' ? counts.any : counts[gender]) : null;
  return (
    <Overlay label="Start calling"><div className="modal">
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
    </div></Overlay>
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
    <Overlay label="Create room"><div className="modal">
      <div className="modal-head"><div><h3>Create a room</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <form onSubmit={submit}>
        <div className="field"><label>Room title</label><input placeholder="Room title" required value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="field"><label>What will you talk about?</label><textarea placeholder="Description" value={topic} onChange={e => setTopic(e.target.value)} /></div>
        <div className="field"><label>Room type</label><select value={kind} onChange={e => setKind(e.target.value)}><option>Audio + Video</option><option>Audio only</option><option>Video only</option></select></div>
        <div className="field"><label>Who can join?</label><div className="chips"><button type="button" className={vis === 'public' ? 'on' : ''} onClick={() => setVis('public')}>Public</button><button type="button" className={vis === 'private' ? 'on' : ''} onClick={() => setVis('private')}>Private</button></div></div>
        {vis === 'private' && <div className="field"><label>Room password</label><input type="password" placeholder="Room password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>}
        <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="submit" className="btn-accent2">Create &amp; join room →</button></div>
      </form>
    </div></Overlay>
  );
}

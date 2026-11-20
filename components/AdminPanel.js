'use client';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, Ic } from './icons';
import MiniChart from './MiniChart';
import { api, toast, Taka } from '@/lib/toast';

const NAV = [
  ['overview', 'chart', 'Overview'], ['users', 'people', 'Users & activity'], ['activity', 'list', 'Activity log'],
  ['reports', 'flagAdm', 'Reports'], ['tickets', 'support', 'Support tickets'], ['packages', 'card', 'Packages'],
  ['payments', 'coin', 'Payments'], ['ai', 'sparkle', 'AI & API settings'], ['controls', 'sliders', 'Platform controls'],
];
const fmtN = n => Number(n || 0).toLocaleString('en-US');
function fmtDT(d) {
  const t = new Date(d); const now = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
  const time = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (t.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (t.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return `${t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`;
}
function fmtTime(d) {
  const t = new Date(d); const now = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
  const time = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (t.toDateString() === now.toDateString()) return `Today · ${time}`;
  if (t.toDateString() === y.toDateString()) return `Yesterday · ${time}`;
  return `${t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
}
function relDay(d) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(new Date(d).setHours(0, 0, 0, 0))) / 86400000);
  if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week'; return `${Math.round(days / 7)} weeks ago`;
}
function relShort(d) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) { const h = Math.round(mins / 60); return h === 1 ? '1 hr ago' : `${h} hrs ago`; }
  const days = Math.round(mins / 1440);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
function Pgn({ page, pages, total, unit, onPage }) {
  if (!total) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="pgn" aria-label="Pages">
      <span className="pgn-info">Page {page} of {pages} · {total} {unit}</span>
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      {nums.map(n => <button type="button" key={n} className={n === page ? 'on' : ''} onClick={() => onPage(n)}>{n}</button>)}
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}
function Switch({ on, onClick, label }) {
  return <button type="button" className={`adm-switch ${on ? 'on' : ''}`} aria-label={label} onClick={onClick}></button>;
}
function BkLogo() {
  return (<svg className="paydd-logo-bk" viewBox="0 0 48 48" aria-hidden="true"><polygon points="5,5 27,13 20,27" fill="#C8104D"></polygon><polygon points="3,15 13,21 6,25" fill="#9E1B4E"></polygon><polygon points="29,11 39,27 21,27" fill="#E2136E"></polygon><polygon points="21,29 38,29 26,37" fill="#ED2A7A"></polygon><polygon points="20,29 13,45 25,37" fill="#B3123F"></polygon><polygon points="40,19 46,24 39,27" fill="#E2136E"></polygon><polygon points="46.5,21.5 48,24 46,26" fill="#ED2A7A"></polygon></svg>);
}
function MethodLogo({ method }) {
  return method === 'bkash' ? <BkLogo /> : <img className="paydd-logo" src="/assets/nagad-logo.png" alt="Nagad" />;
}

export default function AdminPanel({ admin }) {
  const [view, setView] = useState('overview');
  const [counts, setCounts] = useState(null);
  const [pkgEdit, setPkgEdit] = useState(undefined); // undefined = list, null = create, obj = edit
  useEffect(() => { api('/api/admin/overview').then(d => setCounts(d.counts)).catch(() => {}); }, [view]);
  async function logout() { try { await api('/api/admin/logout', { method: 'POST' }); } catch {} window.location.href = '/admin/login'; }
  const badges = { users: counts ? fmtN(counts.users) : null, activity: 'Today', reports: counts?.reports ?? null, tickets: counts?.tickets ?? null, packages: counts?.packages ?? null, payments: counts ? `${counts.payments_due} due` : null };
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-owner"><Avatar user={{ name: admin?.name || 'Admin', avatar: admin?.avatar || '/assets/faces/zahid.jpg', color: '#46536A' }} size={44} /><span><b>{admin?.name || 'Md Zahid Hasan'}</b><small>Super admin · Owner</small></span></div>
        <div className="adm-side-label">Control panel</div>
        <nav className="adm-nav" aria-label="Super admin sections">
          {NAV.map(([v, ic, label]) => (
            <button type="button" key={v} className={(view === v || (v === 'packages' && view === 'create-package')) ? 'on' : ''} onClick={() => { setView(v); setPkgEdit(undefined); }}><Ic n={ic} />{label}{badges[v] != null && badges[v] !== '' ? <span className="adm-nav-n">{badges[v]}</span> : null}</button>
          ))}
        </nav>
        <button type="button" className="adm-back" onClick={() => { window.location.href = '/app'; }}>← Back to app</button>
        <button type="button" className="adm-back" style={{ marginTop: 8 }} onClick={logout}>Log out of admin</button>
      </aside>
      <main className="adm-main">
        {view === 'overview' && <Overview go={setView} />}
        {view === 'users' && <Users />}
        {view === 'activity' && <Activity />}
        {view === 'reports' && <Reports />}
        {view === 'tickets' && <Tickets />}
        {view === 'packages' && pkgEdit === undefined && <Packages onCreate={() => { setPkgEdit(null); setView('create-package'); }} onEdit={p => { setPkgEdit(p); setView('create-package'); }} />}
        {view === 'create-package' && <PackageForm pkg={pkgEdit} onDone={() => { setPkgEdit(undefined); setView('packages'); }} />}
        {view === 'payments' && <Payments />}
        {view === 'ai' && <AiSettings />}
        {view === 'controls' && <Platform />}
      </main>
    </div>
  );
}

function Overview({ go }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/admin/overview').then(setD).catch(e => toast(e.message)); }, []);
  if (!d) return <p className="empty-note">Loading…</p>;
  const devTotal = d.devices.reduce((a, x) => a + x.n, 0) || 1;
  const locMax = Math.max(1, ...d.locations.map(x => x.n));
  const byPlan = {};
  const maxWeek = Math.max(10, ...d.week_series.map(w => w.minutes));
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Platform overview</h3></div>
      <div className="adm-cards">
        <div className="adm-card"><b>{fmtN(d.users)}</b><small>registered users in total</small></div>
        <div className="adm-card"><b>{fmtN(d.today_minutes)}</b><small>talk minutes today{d.delta_pct != null ? <> · <span className="up">▲ {Math.abs(d.delta_pct)}% vs yesterday</span></> : null}</small></div>
        <div className="adm-card"><b>{fmtN(d.today_calls)}</b><small>calls today</small></div>
        <div className="adm-card"><b>{d.avg_call_today} min</b><small>average call length today</small></div>
        <div className="adm-card"><b>{fmtN(d.online)}</b><small>people online right now</small></div>
      </div>
      <div className="adm-grid">
        <div className="adm-panel">
          <h4>Talk minutes — this week</h4>
          <p>{fmtN(d.week_total)} minutes in total over the last 7 days.</p>
          <MiniChart labels={d.week_series.map(w => w.label)} data={d.week_series.map(w => w.minutes)} max={Math.ceil(maxWeek * 1.2)} yTitle="minutes" height={220} />
        </div>
        <div className="adm-panel">
          <h4>Top talkers — today</h4>
          {d.top_talkers.map(t => (
            <div className="adm-row" key={t.id}>
              <span className="av-wrap"><Avatar user={t} />{t.is_online ? <i className="presence" title="Online"></i> : null}</span>
              <span className="who"><b>{t.name}</b><small>{[t.note, t.city, t.device].filter(Boolean).join(' · ')}</small></span>
              <span className="adm-stat"><b>{fmtN(t.minutes)} min</b><small>talked</small></span>
              <span className="adm-stat"><b>{t.calls}</b><small>calls</small></span>
              <span className="adm-stat"><b>{t.calls ? Math.round(t.minutes / t.calls) : 0} min</b><small>avg / call</small></span>
            </div>
          ))}
          {d.top_talkers.length === 0 && <p className="empty-note">No calls yet today.</p>}
        </div>
      </div>
      <div className="adm-grid">
        <div className="adm-panel">
          <h4>Devices people use</h4>
          {d.devices.map(x => { const pct = Math.round((x.n / devTotal) * 100); return (
            <div className="adm-meter" key={x.label}><div className="m-top"><b>{x.label}</b><span>{fmtN(x.n)} · {pct}%</span></div><div className="adm-track"><i style={{ width: `${pct}%` }}></i></div></div>
          ); })}
        </div>
        <div className="adm-panel">
          <h4>Where people practise from</h4>
          {d.locations.map(x => { const pct = Math.round((x.n / devTotal) * 100); return (
            <div className="adm-meter" key={x.label}><div className="m-top"><b>{x.label}</b><span>{fmtN(x.n)} · {pct}%</span></div><div className="adm-track loc"><i style={{ width: `${Math.round((x.n / locMax) * 100)}%` }}></i></div></div>
          ); })}
        </div>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <div className="pay-glance">
          <span className="avatar" style={{ background: 'var(--green)', width: 46, height: 46, fontSize: 15 }}><Taka>৳</Taka></span>
          <span className="pg-main"><b>Payments — <Taka>৳</Taka>{fmtN(d.paid_month_taka)} collected this month</b><p>{d.paid_users} users are on paid plans. {d.overdue.n > 0 ? <><b style={{ color: '#B3261E' }}>{d.overdue.n} payments are overdue (<Taka>৳</Taka>{fmtN(d.overdue.taka)})</b> and </> : null}{d.due7.n} more renewals (<Taka>৳</Taka>{fmtN(d.due7.taka)}) are due in the next 7 days.</p></span>
          <button type="button" className="adm-create-btn" style={{ background: 'var(--ink)' }} onClick={() => go('payments')}>View payments →</button>
        </div>
      </div>
    </div>
  );
}

const USER_FILTERS = [['all', 'All'], ['online', 'Online now'], ['paid', 'Paid plans'], ['free', 'Free'], ['ai', 'AI reports on']];
function Users() {
  const [data, setData] = useState(null); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all');
  const [packages, setPackages] = useState([]); const [selId, setSelId] = useState(null); const [feed, setFeed] = useState([]); const [feedPage, setFeedPage] = useState(1);
  const [planPick, setPlanPick] = useState(false); const [planId, setPlanId] = useState('');
  const load = useCallback(() => { api(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}&filter=${filter}`).then(d => { setData(d); setSelId(prev => (d.users.some(u => u.id === prev) ? prev : d.users[0]?.id ?? null)); }).catch(e => toast(e.message)); }, [page, search, filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/api/admin/packages').then(d => setPackages(d.packages)).catch(() => {}); api('/api/admin/activity').then(d => setFeed(d.feed || [])).catch(() => {}); }, []);
  async function patch(body) { try { await api('/api/admin/users', { method: 'PATCH', body }); toast('Saved'); setPlanPick(false); load(); } catch (e) { toast(e.message); } }
  const sel = data?.users.find(u => u.id === selId) || data?.users[0];
  const FEED_PAGE = 4; const feedPages = Math.max(1, Math.ceil(feed.length / FEED_PAGE));
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>All users &amp; their activity</h3></div>
      <div className="adm-grid" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
        <div className="adm-panel">
          <h4>Users</h4>
          <p>{data ? data.total : 0} shown</p>
          <div className="search" style={{ margin: '14px 0 8px' }}><Ic n="search" size={17} /><input type="search" placeholder="Search users…" aria-label="Search users" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <div className="chips" style={{ margin: '8px 0 6px' }}>{USER_FILTERS.map(([v, l]) => <button type="button" key={v} className={filter === v ? 'on' : ''} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>)}</div>
          <div>
            {data?.users.map(u => (
              <div className={`adm-user-row ${sel?.id === u.id ? 'sel' : ''}`} key={u.id} onClick={() => setSelId(u.id)} style={{ cursor: 'pointer' }}>
                <span className="av-wrap"><Avatar user={u} />{u.is_online ? <i className="presence" title="Online"></i> : null}</span>
                <span className="who"><b>{u.name}</b><small>{[u.city, u.country].filter(Boolean).join(', ')}{u.device ? ` · ${u.device}` : ''}</small></span>
                <span className={`pill-plan ${u.plan && u.plan !== 'Free' ? 'paid' : ''}`}>{u.plan || 'Free'}</span>
                <span className="adm-stat"><b>{fmtN(u.today_minutes)} min</b><small>today</small></span>
                <span className="adm-stat"><b>{fmtN(u.calls)}</b><small>calls total</small></span>
                <span className="pill-status">{u.suspended ? 'Suspended' : u.is_online ? 'Online' : 'Active'}</span>
              </div>
            ))}
            {data && data.users.length === 0 && <p className="empty-note">No user matches that search.</p>}
          </div>
          {data && <Pgn page={data.page} pages={data.pages} total={data.total} unit="users" onPage={setPage} />}
        </div>
        <div>
          <div className="adm-panel">
            <h4>User detail</h4>
            {sel ? <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span className="av-wrap"><Avatar user={sel} size={52} fontSize={16} />{sel.is_online ? <i className="presence" title="Online"></i> : null}</span>
                <span><b style={{ fontSize: 16, display: 'block', lineHeight: 1.25 }}>{sel.name}</b><small style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>{sel.note || ''}</small></span>
                <span style={{ marginLeft: 'auto' }}><span className={`pill-plan ${sel.plan && sel.plan !== 'Free' ? 'paid' : ''}`}>{sel.plan || 'Free'}</span></span>
              </div>
              <div className="pv-row"><span>Location</span><b>{[sel.city, sel.country].filter(Boolean).join(', ') || '—'}</b></div>
              <div className="pv-row"><span>Device</span><b>{sel.device || '—'}</b></div>
              <div className="pv-row"><span>IP address</span><b>{sel.last_ip || '—'}</b></div>
              <div className="pv-row"><span>Joined</span><b>{new Date(sel.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</b></div>
              <div className="pv-row"><span>Last active</span><b>{sel.is_online ? 'Active now' : relShort(sel.last_seen_at)}</b></div>
              <div className="pv-row"><span>Minutes — today / total</span><b>{fmtN(sel.today_minutes)} / {fmtN(sel.minutes)}</b></div>
              <div className="pv-row"><span>Calls completed</span><b>{fmtN(sel.calls)}</b></div>
              <div className="pv-row"><span>AI reports</span><b>{sel.ai_reports_optin ? 'On — opted in' : 'Off'}</b></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="button" className="mini-edit" onClick={() => setPlanPick(p => !p)}>Change plan</button>
                <button type="button" className="mini-edit" onClick={() => patch({ user_id: sel.id, suspended: !sel.suspended })}>{sel.suspended ? 'Unsuspend user' : 'Suspend user'}</button>
              </div>
              {planPick && <div className="adm-note-row" style={{ marginTop: 12 }}><select value={planId} onChange={e => setPlanId(e.target.value)} aria-label="Choose plan"><option value="">Choose plan…</option>{packages.map(p => <option key={p.id} value={p.id}>{p.name} — ৳{p.price_taka}</option>)}</select><button type="button" className="btn-note-save" disabled={!planId} onClick={() => patch({ user_id: sel.id, package_id: Number(planId) })}>Apply</button></div>}
            </> : <p className="empty-note">No user selected.</p>}
          </div>
          <div className="adm-panel" style={{ marginTop: 14 }}>
            <h4>Latest activity — whole platform</h4>
            <div style={{ marginTop: 8 }}>
              {feed.slice((feedPage - 1) * FEED_PAGE, feedPage * FEED_PAGE).map((f, i) => (
                <div className="adm-act-item" key={i}><span className="dot"></span><p><b>{f.text}</b>{f.sub ? <small>{f.sub}</small> : null}<small>{relShort(f.at)}</small></p></div>
              ))}
              {feed.length === 0 && <p className="empty-note">No activity yet.</p>}
            </div>
            <Pgn page={feedPage} pages={feedPages} total={feed.length} unit="events" onPage={setFeedPage} />
          </div>
        </div>
      </div>
    </div>
  );
}

const LOG_TYPES = { report: ['Report', 'report'], sub: ['Subscription', 'sub'], limit: ['AI limit', 'limit'], optin: ['Opt-in', 'optin'] };
function logType(action) {
  const a = String(action || '');
  if (/limit/i.test(a)) return 'limit';
  if (/optin|opt-in/i.test(a)) return 'optin';
  if (/report/i.test(a)) return 'report';
  return 'sub';
}
function Activity() {
  const [d, setD] = useState(null); const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
  useEffect(() => { api('/api/admin/activity').then(setD).catch(e => toast(e.message)); }, []);
  if (!d) return <p className="empty-note">Loading…</p>;
  const rows = (d.log || []).map(l => ({ ...l, type: logType(l.action) })).filter(l => (filter === 'all' || l.type === filter) && (!search || `${l.action} ${l.detail || ''}`.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Activity log</h3></div>
      <div className="log-cards">
        <div className="adm-card"><b>{d.reports_today}</b><small>daily reports generated today</small></div>
        <div className="adm-card"><b>{fmtN(d.ai_minutes_today)} min</b><small>AI minutes used today</small></div>
        <div className="adm-card"><b>{d.subs_today}</b><small>subscription changes today</small></div>
        <div className="adm-card"><b>{d.at_limit}</b><small>users hit the AI soft limit today</small></div>
      </div>
      <div className="adm-grid" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
        <div className="adm-panel">
          <h4>Today &amp; yesterday</h4>
          <p>{rows.length} events shown</p>
          <div className="search" style={{ margin: '14px 0 8px' }}><Ic n="search" size={17} /><input type="search" placeholder="Search the log…" aria-label="Search activity log" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="chips" style={{ margin: '8px 0 6px' }}>{[['all', 'All'], ['report', 'Daily reports'], ['sub', 'Subscriptions'], ['limit', 'AI limits'], ['optin', 'Opt-ins']].map(([v, l]) => <button type="button" key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>)}</div>
          <div>
            {rows.map(l => { const [label, cls] = LOG_TYPES[l.type]; return (
              <div className="log-row" key={l.id}>
                <Avatar user={{ name: l.detail || l.action, color: '#46536A' }} />
                <span className="log-main"><b>{String(l.action).replace(/_/g, ' ')}</b><p>{l.detail || ''}</p></span>
                <span className={`log-badge ${cls}`}>{label}</span>
                <span className="log-time">{new Date(l.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}<span>{relDay(l.created_at) === 'today' ? 'Today' : relDay(l.created_at) === 'yesterday' ? 'Yesterday' : relDay(l.created_at)}</span></span>
              </div>
            ); })}
            {rows.length === 0 && <p className="empty-note">No events match.</p>}
          </div>
        </div>
        <div className="adm-panel">
          <h4>AI usage — today</h4>
          <div style={{ marginTop: 12 }}>
            {d.ai_usage.map(u => { const lim = d.soft_limit || 30; const pct = Math.min(100, Math.round((u.minutes / lim) * 100)); const over = u.minutes >= lim; const warn = !over && pct >= 80; return (
              <div className="ai-usage-row" key={u.name}>
                <div className="ai-usage-top"><b>{u.name}</b><span className="ai-usage-num">{u.minutes} / {lim} min</span></div>
                <div className="ai-usage-track"><i className={over ? 'over' : warn ? 'warn' : ''} style={{ width: `${pct}%` }}></i></div>
                <small>{over ? 'Limit reached — AI paused until tomorrow' : warn ? 'Near the limit — gentle note shown' : 'Within today’s limit'}</small>
              </div>
            ); })}
            {d.ai_usage.length === 0 && <p className="empty-note">No AI reports generated yet today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const NOTE_CHIPS = ['Taken care of', 'Checked — no problem found', 'Warning sent', 'Asked for more detail'];
const REP_FILTERS = [['all', 'All'], ['new', 'New'], ['reviewed', 'Reviewed'], ['noted', 'Handled · note added'], ['blocked', 'Platform-blocked']];
function Reports() {
  const [d, setD] = useState(null); const [page, setPage] = useState(1); const [filter, setFilter] = useState('all'); const [notes, setNotes] = useState({});
  const load = useCallback(() => { api(`/api/admin/reports?page=${page}`).then(setD).catch(e => toast(e.message)); }, [page]);
  useEffect(() => { load(); }, [load]);
  async function patch(body) { try { await api('/api/admin/reports', { method: 'PATCH', body }); toast('Saved'); load(); } catch (e) { toast(e.message); } }
  const rows = (d?.reports || []).filter(r => filter === 'all' ? true : filter === 'new' ? r.status === 'open' : filter === 'reviewed' ? r.status === 'reviewed' : filter === 'noted' ? !!r.admin_note : !!r.reported_suspended);
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Reports — users reporting users</h3></div>
      <div className="log-cards">
        <div className="adm-card"><b>{d?.counts.open ?? 0}</b><small>new reports waiting</small></div>
        <div className="adm-card"><b>{d?.counts.distinct_reported ?? 0}</b><small>different users reported</small></div>
        <div className="adm-card"><b>{d?.counts.blocked ?? 0}</b><small>blocked from the platform</small></div>
        <div className="adm-card"><b>{d?.counts.reviewed ?? 0}</b><small>reviewed</small></div>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <h4>All reports</h4>
        <p>{rows.length} shown · newest first.</p>
        <div className="chips" style={{ margin: '12px 0 6px' }}>{REP_FILTERS.map(([v, l]) => <button type="button" key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{l}</button>)}</div>
        <div>
          {rows.map(r => (
            <div className="rep-row" key={r.id}>
              <Avatar user={{ name: r.reported_name, avatar: r.reported_avatar }} />
              <span className="rep-main">
                <b>{r.reported_name}</b> <span className="log-badge user-report">{r.reason}</span> {r.status === 'open' ? <span className="pill-status pill-rep-new">New</span> : <span className="pill-status">Reviewed</span>}{r.admin_note ? <> <span className="pill-status">✓ Note added</span></> : null}
                <p>Reported by <b>{r.reporter_name}</b> · {r.reports_against} reports against this user in total · {fmtDT(r.created_at)}</p>
                {r.details ? <div className="rep-detail">“{r.details}”</div> : null}
                {r.admin_note ? <div className="adm-note"><b>Super admin note</b>{r.admin_note}</div> : null}
                <span className="rep-actions">
                  {r.status === 'open' ? <button type="button" className="mini-edit" onClick={() => patch({ report_id: r.id, status: 'reviewed' })}>Mark reviewed</button> : null}
                  {!r.reported_suspended ? <button type="button" className="btn-platform-block" onClick={() => patch({ report_id: r.id, block_user: true })}>Block from platform</button> : null}
                </span>
                <div className="adm-note-form">
                  <span className="qn-label">Super admin note</span>
                  <div className="qn-chips">{NOTE_CHIPS.map(c => <button type="button" key={c} className="qn-chip" onClick={() => setNotes({ ...notes, [r.id]: c })}>{c}</button>)}</div>
                  <div className="adm-note-row"><input className="qn-input" maxLength={90} placeholder="Short note" aria-label="Short admin note" value={notes[r.id] ?? r.admin_note ?? ''} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} /><button type="button" className="btn-note-save" onClick={() => patch({ report_id: r.id, admin_note: notes[r.id] ?? r.admin_note ?? '' })}>{r.admin_note ? 'Update note' : 'Add note'}</button></div>
                </div>
              </span>
            </div>
          ))}
          {d && rows.length === 0 && <p className="empty-note">No report matches that filter.</p>}
        </div>
        {d && <Pgn page={d.page} pages={d.pages} total={d.total} unit="reports" onPage={setPage} />}
      </div>
    </div>
  );
}

const TKT_CHIPS = ['Taken care of', 'We are looking into it', 'Fixed — please try again', 'Please update the app and retry'];
const TKT_STATUS_UI = { open: 'In progress', answered: 'Answered', resolved: 'Resolved' };
function Tickets() {
  const [d, setD] = useState(null); const [page, setPage] = useState(1); const [notes, setNotes] = useState({}); const [status, setStatus] = useState({});
  const load = useCallback(() => { api(`/api/admin/tickets?page=${page}`).then(setD).catch(e => toast(e.message)); }, [page]);
  useEffect(() => { load(); }, [load]);
  async function patch(body) { try { await api('/api/admin/tickets', { method: 'PATCH', body }); toast('Saved'); load(); } catch (e) { toast(e.message); } }
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Support tickets — from users</h3></div>
      <div className="log-cards">
        <div className="adm-card"><b>{d?.counts.open ?? 0}</b><small>open / in progress</small></div>
        <div className="adm-card"><b>{d?.counts.total ?? 0}</b><small>tickets received in total</small></div>
        <div className="adm-card"><b>{d?.counts.noted ?? 0}</b><small>with your short note</small></div>
        <div className="adm-card"><b>{d?.counts.resolved ?? 0}</b><small>resolved</small></div>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <h4>All tickets</h4>
        <p>{d?.tickets.length || 0} shown · newest first.</p>
        <div>
          {d?.tickets.map(t => {
            const uiStatus = status[t.id] || TKT_STATUS_UI[t.status] || 'In progress';
            return (
              <div className="rep-row" key={t.id}>
                <Avatar user={{ name: t.user_name, avatar: t.avatar }} />
                <span className="rep-main">
                  <b>{t.subject}</b> <span className="log-badge user-report">{t.kind}</span> <span className={`sup-status ${t.status === 'open' ? '' : t.status}`}>{TKT_STATUS_UI[t.status] || 'In progress'}</span>
                  <p>Ticket <b>#{t.id}</b> · from <b>{t.user_name}</b> · Opened {relDay(t.created_at)}{t.admin_note ? ` · last reply ${relShort(t.updated_at)}` : ''}</p>
                  <div className="rep-detail">{t.body}</div>
                  {t.admin_note ? <div className="adm-note"><b>Support reply already sent</b>{t.admin_note}</div> : null}
                  <div className="adm-note-form">
                    <span className="qn-label">Super admin note</span>
                    <div className="qn-chips">{TKT_CHIPS.map(c => <button type="button" key={c} className="qn-chip" onClick={() => setNotes({ ...notes, [t.id]: c })}>{c}</button>)}</div>
                    <div className="adm-note-row">
                      <input className="qn-input" maxLength={90} placeholder="Short note" aria-label="Short admin note" value={notes[t.id] ?? ''} onChange={e => setNotes({ ...notes, [t.id]: e.target.value })} />
                      <select className="qn-status" aria-label="Ticket status" value={uiStatus} onChange={e => setStatus({ ...status, [t.id]: e.target.value })}>
                        <option>Open</option><option>In progress</option><option>Answered</option><option>Resolved</option>
                      </select>
                      <button type="button" className="btn-note-save" onClick={() => patch({ ticket_id: t.id, admin_note: (notes[t.id] ?? '') || undefined, status: uiStatus === 'Resolved' ? 'resolved' : uiStatus === 'Answered' ? 'answered' : 'open' })}>{t.admin_note ? 'Update note' : 'Add note'}</button>
                    </div>
                  </div>
                </span>
              </div>
            );
          })}
          {d && d.tickets.length === 0 && <p className="empty-note">No tickets.</p>}
        </div>
        {d && <Pgn page={d.page} pages={d.pages} total={d.total} unit="tickets" onPage={setPage} />}
      </div>
    </div>
  );
}

function Packages({ onCreate, onEdit }) {
  const [packages, setPackages] = useState([]);
  const load = useCallback(() => { api('/api/admin/packages').then(d => setPackages(d.packages)).catch(e => toast(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  async function toggleVis(p) { try { await api('/api/admin/packages', { method: 'POST', body: { id: p.id, name: p.name, price_taka: p.price_taka, period: p.period, daily_call_minutes: p.daily_call_minutes, ai_reports: p.ai_reports, ai_report_frequency: p.ai_report_frequency, tag: p.tag, description: p.description, included: p.included, not_included: p.not_included, is_active: p.is_active ? 0 : 1, sort_order: p.sort_order } }); load(); } catch (e) { toast(e.message); } }
  return (
    <div className="adm-sec">
      <div className="adm-sec-head with-action"><span><h3>Packages — subscriptions you control</h3></span><button type="button" className="adm-create-btn" onClick={onCreate}><span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>+</span> Create package</button></div>
      <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        {packages.map(p => (
          <div className="adm-pkg" key={p.id}>
            <div className="adm-pkg-top">
              <span><h4>{p.name}</h4><p style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginTop: 3 }}>{p.description}</p></span>
              <span style={{ textAlign: 'right' }}><span className="pkg-price"><Taka>৳</Taka>{p.price_taka} <small>{p.price_taka === 0 ? 'free for now' : p.period === 'year' ? '/ year' : p.period === 'once' ? 'one-time' : '/ month'}</small></span></span>
            </div>
            <div className="adm-pkg-cols">
              <div><h5>Included</h5><ul>{(p.included || '').split('\n').filter(Boolean).map(f => <li key={f}>{f}</li>)}</ul></div>
              <div><h5>Not included</h5><ul>{(p.not_included || '').split('\n').filter(Boolean).map(f => <li key={f} className="no">{f}</li>)}</ul></div>
            </div>
            <div className="adm-pkg-foot">
              <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>Visible to users</span>
              <Switch on={!!p.is_active} onClick={() => toggleVis(p)} label={`Toggle visibility of ${p.name}`} />
              <span className="sp"></span>
              <button type="button" className="mini-edit" onClick={() => onEdit(p)}>Edit package</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackageForm({ pkg, onDone }) {
  const [f, setF] = useState({
    name: pkg?.name || '', tag: pkg?.tag || '', price_taka: pkg?.price_taka ?? '',
    period: pkg?.period === 'year' ? '/ year' : pkg?.period === 'once' ? 'one-time' : pkg?.price_taka === 0 && !pkg ? 'free for now' : '/ month',
    description: pkg?.description || '', included: pkg?.included || '', not_included: pkg?.not_included || '',
    daily: pkg?.daily_call_minutes == null ? 'Unlimited calls' : pkg?.daily_call_minutes === 15 ? '15 minutes of calls per day' : pkg?.daily_call_minutes === 30 ? '30 minutes of calls per day' : '60 minutes of calls per day',
    is_active: pkg ? !!pkg.is_active : true, ai: pkg ? !!pkg.ai_reports : false,
    ai_frequency: pkg?.ai_report_frequency || 'daily',
  });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  async function save(e) {
    e.preventDefault();
    const daily_call_minutes = f.daily === 'Unlimited calls' ? null : parseInt(f.daily, 10);
    const period = f.period === '/ year' ? 'year' : f.period === 'one-time' ? 'once' : 'month';
    try { await api('/api/admin/packages', { method: 'POST', body: { id: pkg?.id, name: f.name, tag: f.tag, price_taka: Number(f.price_taka) || 0, period, daily_call_minutes, ai_reports: f.ai, ai_report_frequency: f.ai ? f.ai_frequency : 'none', description: f.description, included: f.included, not_included: f.not_included, is_active: f.is_active ? 1 : 0, sort_order: pkg?.sort_order ?? 99 } }); toast('Package saved'); onDone(); }
    catch (err) { toast(err.message); }
  }
  return (
    <div className="adm-sec">
      <button type="button" className="adm-back-link" onClick={onDone}>← Back to packages</button>
      <div className="adm-sec-head"><h3>{pkg ? 'Edit package' : 'Create package'}</h3></div>
      <div className="adm-panel" style={{ marginTop: 20 }}>
        <h4>{pkg ? `Edit — ${pkg.name}` : 'Create a new package'}</h4>
        <form onSubmit={save}>
          <div className="adm-form-grid">
            <div className="field"><label>Package name</label><input placeholder="Package name" value={f.name} onChange={e => set('name', e.target.value)} required /></div>
            <div className="field"><label>Badge text</label><input placeholder="Badge text" value={f.tag} onChange={e => set('tag', e.target.value)} /></div>
            <div className="field"><label>Price (<Taka>৳</Taka>)</label><input type="number" min="0" step="1" placeholder="Price" value={f.price_taka} onChange={e => set('price_taka', e.target.value)} required /></div>
            <div className="field"><label>Billing</label><select value={f.period} onChange={e => set('period', e.target.value)}><option value="/ month">Per month</option><option value="/ year">Per year</option><option value="one-time">One-time</option><option value="free for now">Free</option></select></div>
            <div className="field"><label>Best for</label><input placeholder="Best for" value={f.description} onChange={e => set('description', e.target.value)} /></div>
            <div className="field"><label>Daily call limit</label><select value={f.daily} onChange={e => set('daily', e.target.value)}><option>Unlimited calls</option><option>60 minutes of calls per day</option><option>30 minutes of calls per day</option><option>15 minutes of calls per day</option></select></div>
            <div className="field full"><label>Short description</label><textarea placeholder="Short description" value={f.description} onChange={e => set('description', e.target.value)} /></div>
            <div className="field"><label>Included</label><textarea style={{ minHeight: 110 }} placeholder="Included" value={f.included} onChange={e => set('included', e.target.value)} /></div>
            <div className="field"><label>Not included</label><textarea style={{ minHeight: 110 }} placeholder="Not included" value={f.not_included} onChange={e => set('not_included', e.target.value)} /></div>
          </div>
          <div className="adm-ctl"><span className="ct"><b>Visible to users</b></span><Switch on={f.is_active} onClick={() => set('is_active', !f.is_active)} label="Toggle package visibility" /></div>
          <div className="adm-ctl"><span className="ct"><b>AI reports in this package</b></span><Switch on={f.ai} onClick={() => set('ai', !f.ai)} label="Toggle AI reports for this package" /></div>
          {f.ai && <div className="field" style={{ maxWidth: 320 }}><label>AI report frequency</label><div className="chips">{[['weekly', 'Weekly'], ['daily', 'Daily']].map(([v, l]) => <button type="button" key={v} className={f.ai_frequency === v ? 'on' : ''} onClick={() => set('ai_frequency', v)}>{l}</button>)}</div></div>}
          <div className="modal-actions"><button type="button" className="btn-soft" onClick={onDone}>Cancel</button><button type="submit" className="btn-accent2">{pkg ? 'Save package →' : 'Create package →'}</button></div>
        </form>
      </div>
    </div>
  );
}

function Payments() {
  const [d, setD] = useState(null); const [paidPage, setPaidPage] = useState(1); const [reminded, setReminded] = useState({});
  const load = useCallback(() => { api('/api/admin/payments').then(setD).catch(e => toast(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  async function act(body) { try { await api('/api/admin/payments', { method: 'POST', body }); toast('Done'); load(); } catch (e) { toast(e.message); } }
  if (!d) return <p className="empty-note">Loading…</p>;
  const s = d.stats;
  const byPlanTxt = s.by_plan.filter(p => p.price_taka > 0).map(p => `${p.subs} ${p.name}`).join(' + ');
  const collectedPct = s.expected_taka > 0 ? Math.round((s.month_taka / s.expected_taka) * 100) : 0;
  const PAID_PAGE = 4; const paidPages = Math.max(1, Math.ceil(d.paid.length / PAID_PAGE));
  const dueBadge = exp => {
    const days = Math.round((new Date(new Date(exp).setHours(0, 0, 0, 0)) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
    if (days < 0) return { cls: 'overdue', label: `Overdue · ${-days} day${days === -1 ? '' : 's'}`, small: `was due ${new Date(exp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` };
    if (days === 0) return { cls: 'due', label: 'Due today', small: `due ${new Date(exp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` };
    if (days === 1) return { cls: 'due', label: 'Due tomorrow', small: `due ${new Date(exp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` };
    return { cls: 'due', label: `Due in ${days} days`, small: `due ${new Date(exp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` };
  };
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Payments — who paid &amp; who is going to pay</h3></div>
      <div className="adm-panel pay-req-panel" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h4 style={{ margin: 0 }}>Payment requests — waiting for confirmation</h4><span className="pay-req-count">{d.waiting.length} waiting</span><span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{d.rejected_count ? `${d.rejected_count} rejected in total` : ''}</span></div>
        <div style={{ marginTop: 6 }}>
          {d.waiting.map(p => (
            <div className="pay-req-row" key={p.id}>
              <Avatar user={{ name: p.user_name, avatar: p.avatar }} />
              <span className="who"><b>{p.user_name}</b><small>{p.package_name} plan · <Taka>৳</Taka>{p.amount_taka} / month</small></span>
              <span className="pay-req-det"><MethodLogo method={p.method} /><span><b>{p.method === 'bkash' ? 'bKash' : 'Nagad'}</b><small>from {p.sender_number}</small></span></span>
              <span className="pay-req-trx" title="Transaction ID">TrxID · {p.trxid}</span>
              <span style={{ textAlign: 'right' }}><span className="pay-badge waiting">Waiting</span><small style={{ display: 'block', fontSize: 11, color: 'var(--faint)', fontWeight: 700, marginTop: 5 }}>{fmtTime(p.created_at)}</small></span>
              <span style={{ display: 'flex', gap: 7 }}><button type="button" className="btn-approve" onClick={() => act({ action: 'approve', payment_id: p.id })}>Approve</button><button type="button" className="btn-reject" onClick={() => act({ action: 'reject', payment_id: p.id })}>Reject</button></span>
            </div>
          ))}
          {d.waiting.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, padding: '12px 2px 4px' }}>No payment requests are waiting right now.</p>}
        </div>
      </div>
      <div className="log-cards">
        <div className="adm-card"><b><Taka>৳</Taka>{fmtN(s.month_taka)}</b><small>collected this month · of <Taka>৳</Taka>{fmtN(s.expected_taka)} expected from paid plans</small></div>
        <div className="adm-card"><b><Taka>৳</Taka>{fmtN(s.today_taka)}</b><small>collected today · {s.today_count} payments</small></div>
        <div className="adm-card"><b>{s.paid_users}</b><small>users on paid plans{byPlanTxt ? ` · ${byPlanTxt}` : ''}</small></div>
        <div className="adm-card"><b style={{ color: '#B3261E' }}>{d.due.filter(x => new Date(x.expires_at) < new Date()).length} overdue</b><small>still to collect · {d.due.length} due in 7 days</small></div>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <h4>This month’s collection</h4>
        <p><Taka>৳</Taka>{fmtN(s.month_taka)} of <Taka>৳</Taka>{fmtN(s.expected_taka)} collected — <b>{collectedPct}%</b>.</p>
        <div className="pay-progress"><i style={{ width: `${collectedPct}%` }}></i></div>
      </div>
      <div className="adm-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="adm-panel">
          <h4>Who paid — recent payments</h4>
          <div style={{ marginTop: 6 }}>
            {d.paid.slice((paidPage - 1) * PAID_PAGE, paidPage * PAID_PAGE).map(p => (
              <div className="pay-row" key={p.id}>
                <Avatar user={{ name: p.user_name, avatar: p.avatar }} />
                <span className="who"><b>{p.user_name}</b><small>{p.package_name} · {p.user_city || ''}</small></span>
                <span className="pay-amt"><b><Taka>৳</Taka>{p.amount_taka}</b><small>{p.method === 'bkash' ? 'bKash' : 'Nagad'} · {p.trxid}</small></span>
                <span style={{ textAlign: 'right' }}><span className="pay-badge">Paid</span><small style={{ display: 'block', fontSize: 11, color: 'var(--faint)', fontWeight: 700, marginTop: 5 }}>{fmtTime(p.decided_at || p.created_at)}</small></span>
              </div>
            ))}
            {d.paid.length === 0 && <p className="empty-note">No approved payments yet.</p>}
          </div>
          <Pgn page={paidPage} pages={paidPages} total={d.paid.length} unit="payments" onPage={setPaidPage} />
        </div>
        <div className="adm-panel">
          <h4>Who is going to pay — upcoming &amp; overdue</h4>
          <div style={{ marginTop: 6 }}>
            {d.due.map(x => { const b = dueBadge(x.expires_at); return (
              <div className="pay-row" key={x.id}>
                <Avatar user={{ name: x.user_name, avatar: x.avatar }} />
                <span className="who"><b>{x.user_name}</b><small>{x.package_name} · {x.city || ''}{x.last_method ? ` · usually pays by ${x.last_method === 'bkash' ? 'bKash' : 'Nagad'}` : ''}</small></span>
                <span className="pay-amt"><b><Taka>৳</Taka>{x.price_taka}</b><small>{b.small}</small></span>
                <span className={`pay-badge ${b.cls}`}>{b.label}</span>
                <button type="button" className={`pay-remind ${reminded[x.user_id] ? 'sent' : ''}`} disabled={!!reminded[x.user_id]} onClick={async () => { await act({ action: 'remind', user_id: x.user_id }); setReminded(r => ({ ...r, [x.user_id]: true })); }}>{reminded[x.user_id] ? 'Reminder sent ✓' : 'Remind'}</button>
              </div>
            ); })}
            {d.due.length === 0 && <p className="empty-note">Nobody is due in the next 7 days.</p>}
          </div>
        </div>
      </div>
      <div className="adm-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="adm-panel">
          <h4>Payment methods — this month</h4>
          {s.methods.map(m => { const tot = s.methods.reduce((a, x) => a + Number(x.t), 0) || 1; const pct = Math.round((Number(m.t) / tot) * 100); return (
            <div className="adm-meter" key={m.method}><div className="m-top"><b>{m.method === 'bkash' ? 'bKash' : 'Nagad'}</b><span><Taka>৳</Taka>{fmtN(m.t)} · {pct}%</span></div><div className="adm-track"><i style={{ width: `${pct}%` }}></i></div></div>
          ); })}
          {s.methods.length === 0 && <p className="empty-note">No payments this month.</p>}
        </div>
        <div className="adm-panel">
          <h4>By plan</h4>
          {s.by_plan.map(p => (
            <div className="adm-row" key={p.name}><span className="who"><b>{p.name}</b><small>{p.subs} subscribers</small></span><span className="adm-stat"><b><Taka>৳</Taka>{fmtN(Number(p.price_taka) * Number(p.subs))}</b><small>expected / month</small></span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AiSettings() {
  const [s, setS] = useState(null); const [premium, setPremium] = useState(0); const [showKey, setShowKey] = useState(false);
  const [act, setAct] = useState(null); const [rules, setRules] = useState({});
  useEffect(() => {
    api('/api/admin/ai-settings').then(d => { setS(d.settings); setPremium(d.premium_users); }).catch(e => toast(e.message));
    api('/api/admin/activity').then(setAct).catch(() => {});
    api('/api/admin/settings').then(d => setRules(d.settings || {})).catch(() => {});
  }, []);
  if (!s) return <p className="empty-note">Loading…</p>;
  const set = (k, v) => setS(x => ({ ...x, [k]: v }));
  const usedUsd = Number(rules.ai_used_usd || 0);
  const balance = Number(s.credit_balance_usd) || 0;
  const usedPct = balance > 0 ? Math.min(100, Math.round((usedUsd / balance) * 100)) : 0;
  async function save(e) { e.preventDefault(); try { await api('/api/admin/ai-settings', { method: 'POST', body: s }); toast('AI settings saved'); } catch (err) { toast(err.message); } }
  async function saveRules() { try { await api('/api/admin/settings', { method: 'POST', body: rules }); toast('Saved'); } catch (err) { toast(err.message); } }
  const softOn = rules.ai_soft_limit_on !== '0';
  const ruleOn = k => rules[k] !== '0';
  const includes = String(rules.ai_report_includes || 'Fluency,Grammar,Lexical resources').split(',');
  function toggleInclude(name) { const next = includes.includes(name) ? includes.filter(x => x !== name) : [...includes, name]; setRules(r => ({ ...r, ai_report_includes: next.join(',') })); }
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>AI &amp; API settings</h3></div>
      <div className="adm-grid" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
        <div className="adm-panel">
          <h4>API connection</h4>
          <form onSubmit={save}>
            <div className="adm-form-grid">
              <div className="field"><label>AI provider</label><select value={s.provider || 'DeepSeek'} onChange={e => set('provider', e.target.value)}><option>DeepSeek</option><option>OpenAI</option><option>Google Gemini</option><option>Azure OpenAI</option><option>Custom endpoint</option></select></div>
              <div className="field"><label>API base URL</label><input value={s.base_url || ''} onChange={e => set('base_url', e.target.value)} /></div>
              <div className="field full"><label>API key</label><div className="adm-key-row"><input type={showKey ? 'text' : 'password'} value={s.api_key_masked || ''} onChange={e => set('api_key_masked', e.target.value)} autoComplete="off" placeholder="API key — stored masked" /><button type="button" onClick={() => setShowKey(v => !v)}>{showKey ? 'Hide' : 'Show'}</button></div></div>
              <div className="field"><label>Speech-to-text model</label><input value={s.stt_model || ''} onChange={e => set('stt_model', e.target.value)} /></div>
              <div className="field"><label>Report analysis model</label><input value={s.analysis_model || ''} onChange={e => set('analysis_model', e.target.value)} /></div>
              <div className="field"><label>Report language</label><select value={rules.ai_language || 'English'} onChange={e => setRules(r => ({ ...r, ai_language: e.target.value }))}><option>English</option><option>English with Bengali explanations</option></select></div>
              <div className="field"><label>Creativity (temperature)</label><select value={rules.ai_temperature || '0.3 — steady and factual'} onChange={e => setRules(r => ({ ...r, ai_temperature: e.target.value }))}><option>0.3 — steady and factual</option><option>0.5 — balanced</option><option>0.7 — more varied wording</option></select></div>
            </div>
            <button type="submit" className="adm-save">Save API settings</button>
            <button type="button" className="adm-save accent" style={{ marginLeft: 8 }} onClick={() => toast(s.api_key_masked ? 'Connection settings saved — key present' : 'Add an API key first')}>Test connection</button>
          </form>
        </div>
        <div>
          <div className="adm-credit">
            <small>AI CREDIT BALANCE</small>
            <b className="cr-big">${balance.toFixed(2)}</b>
            <small>One-time starting credit · topped up from premium subscriptions</small>
            <div className="adm-meter" style={{ borderTopColor: 'rgba(255,255,255,.14)' }}><div className="m-top"><b style={{ color: '#fff' }}>Used this month</b><span style={{ color: 'rgba(255,255,255,.65)' }}>${usedUsd.toFixed(2)} · {usedPct}%</span></div><div className="adm-track" style={{ background: 'rgba(255,255,255,.14)' }}><i style={{ width: `${usedPct}%`, background: 'var(--accent)' }}></i></div></div>
            <button type="button" className="adm-save accent" style={{ marginTop: 14 }} onClick={() => toast('Top-ups come from premium subscriptions')}>Buy more credit</button>
          </div>
          <div className="adm-panel" style={{ marginTop: 14 }}>
            <h4>Reports this month</h4>
            <div className="adm-row"><span className="who"><b>{act?.reports_today ?? 0}</b><small>reports generated today</small></span><span className="adm-stat"><b>{premium}</b><small>users on AI plans</small></span></div>
            <div className="adm-row"><span className="who"><b>~$0.03</b><small>average cost per report</small></span><span className="adm-stat"><b>1 / day</b><small>per user, max</small></span></div>
          </div>
        </div>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <h4>Soft limit — daily AI minutes per user</h4>
        <div className="adm-ctl"><span className="ct"><b>Soft limit on</b></span><Switch on={softOn} onClick={() => setRules(r => ({ ...r, ai_soft_limit_on: softOn ? '0' : '1' }))} label="Toggle AI soft limit" /></div>
        <form onSubmit={async e => { e.preventDefault(); try { await api('/api/admin/ai-settings', { method: 'POST', body: s }); await saveRules(); toast('Soft limit saved'); } catch (err) { toast(err.message); } }}>
          <div className="adm-form-grid" style={{ maxWidth: 760 }}>
            <div className="field"><label>AI minutes per user, per day</label><input type="number" min="5" max="180" step="5" value={s.soft_daily_ai_minutes} onChange={e => set('soft_daily_ai_minutes', e.target.value)} /></div>
            <div className="field"><label>Warn the user at</label><select value={rules.ai_soft_warn || '80% of the limit'} onChange={e => setRules(r => ({ ...r, ai_soft_warn: e.target.value }))}><option>80% of the limit</option><option>50% of the limit</option><option>Only when the limit is reached</option></select></div>
            <div className="field full"><label>When a user reaches the limit</label><select value={rules.ai_soft_behaviour || 'Pause AI analysis until tomorrow — calls keep working as normal'} onChange={e => setRules(r => ({ ...r, ai_soft_behaviour: e.target.value }))}><option>Pause AI analysis until tomorrow — calls keep working as normal</option><option>Finish today’s report, then pause until tomorrow</option><option>Queue the report for tomorrow’s credit</option></select></div>
          </div>
          <div style={{ marginTop: 14 }}>
            {(act?.ai_usage || []).map(u => { const lim = act.soft_limit || 30; const pct = Math.min(100, Math.round((u.minutes / lim) * 100)); const over = u.minutes >= lim; const warn = !over && pct >= 80; return (
              <div className="ai-usage-row" key={u.name}><div className="ai-usage-top"><b>{u.name}</b><span className="ai-usage-num">{u.minutes} / {lim} min</span></div><div className="ai-usage-track"><i className={over ? 'over' : warn ? 'warn' : ''} style={{ width: `${pct}%` }}></i></div><small>{over ? 'Limit reached — AI paused until tomorrow' : warn ? 'Near the limit — gentle note shown' : 'Within today’s limit'}</small></div>
            ); })}
          </div>
          <button type="submit" className="adm-save">Save soft limit</button>
        </form>
      </div>
      <div className="adm-panel" style={{ marginTop: 14 }}>
        <h4>AI reports — rules you control</h4>
        {[['ai_reports_on', 'AI reports — master switch'], ['ai_daily_one', 'One report per user per report day'], ['ai_first_call_ask', 'Ask on the first premium call'], ['ai_profile_optout', 'Users can stop reports in Profile → Preferences'], ['ai_own_voice', 'Analyse only the user’s own voice']].map(([k, label]) => (
          <div className="adm-ctl" key={k}><span className="ct"><b>{label}</b></span><Switch on={ruleOn(k)} onClick={() => setRules(r => ({ ...r, [k]: ruleOn(k) ? '0' : '1' }))} label={label} /></div>
        ))}
        <div className="field" style={{ maxWidth: 520 }}><label>What each report includes</label>
          <div className="adm-checks">
            {[['Fluency', 'Fluency — how smoothly they spoke'], ['Grammar', 'Grammar — mistakes and how to fix them'], ['Lexical resources', 'Lexical resources — word choice and range']].map(([name, label]) => (
              <label key={name}><input type="checkbox" checked={includes.includes(name)} onChange={() => toggleInclude(name)} /> {label}</label>
            ))}
          </div>
        </div>
        <div className="adm-form-grid" style={{ maxWidth: 760 }}>
          <div className="field"><label>Generate reports at</label><select value={rules.ai_report_time || "11:30 PM (user's local time)"} onChange={e => setRules(r => ({ ...r, ai_report_time: e.target.value }))}><option>11:30 PM (user&apos;s local time)</option><option>9:00 PM (user&apos;s local time)</option><option>Right after the last call of the day</option></select></div>
          <div className="field"><label>Low-credit alert at</label><select value={rules.ai_alert_at || '$5 remaining'} onChange={e => setRules(r => ({ ...r, ai_alert_at: e.target.value }))}><option>$5 remaining</option><option>$10 remaining</option><option>$2 remaining</option></select></div>
        </div>
        <button type="button" className="adm-save" onClick={saveRules}>Save report rules</button>
      </div>
    </div>
  );
}

const CTLS = [['ctl_registrations', 'New registrations'], ['ctl_matching', 'Start Calling — random matching'], ['ctl_rooms', 'Create rooms'], ['ctl_ratings', 'Partner ratings'], ['ctl_blocking', 'Blocking & safety tools'], ['ctl_nudge', 'English nudge'], ['ctl_video', 'Video calls'], ['ctl_maintenance', 'Maintenance mode']];
const CTL_DEFAULT_OFF = new Set(['ctl_maintenance']);
function Platform() {
  const [s, setS] = useState(null);
  useEffect(() => { api('/api/admin/settings').then(d => setS(d.settings || {})).catch(() => setS({})); }, []);
  if (!s) return <p className="empty-note">Loading…</p>;
  const on = k => (s[k] !== undefined ? s[k] !== '0' : !CTL_DEFAULT_OFF.has(k));
  async function toggle(k) { const next = { ...s, [k]: on(k) ? '0' : '1' }; setS(next); try { await api('/api/admin/settings', { method: 'POST', body: { [k]: next[k] } }); } catch (e) { toast(e.message); } }
  async function save(e) { e.preventDefault(); try { await api('/api/admin/settings', { method: 'POST', body: s }); toast('Saved'); } catch (err) { toast(err.message); } }
  return (
    <div className="adm-sec">
      <div className="adm-sec-head"><h3>Platform controls</h3></div>
      <div className="adm-grid">
        <div className="adm-panel">
          <h4>Features on / off</h4>
          {CTLS.map(([k, label]) => <div className="adm-ctl" key={k}><span className="ct"><b>{label}</b></span><Switch on={on(k)} onClick={() => toggle(k)} label={label} /></div>)}
          <div className="adm-ctl"><span className="ct"><b>bKash number (manual payments)</b></span></div>
          <form onSubmit={save}>
            <div className="field"><label>bKash number</label><input value={s.pay_bkash_number || ''} onChange={e => setS({ ...s, pay_bkash_number: e.target.value })} /></div>
            <div className="field"><label>Nagad number</label><input value={s.pay_nagad_number || ''} onChange={e => setS({ ...s, pay_nagad_number: e.target.value })} /></div>
            <button type="submit" className="adm-save">Save payment numbers</button>
          </form>
        </div>
        <div>
          <div className="adm-panel">
            <h4>Limits</h4>
            <form onSubmit={save}>
              <div className="field"><label>Free plan — call minutes per day</label><input type="number" min="0" value={s.lim_free_minutes ?? 15} onChange={e => setS({ ...s, lim_free_minutes: e.target.value })} /></div>
              <div className="field"><label>Longest single call (minutes)</label><input type="number" min="5" value={s.lim_max_call ?? 120} onChange={e => setS({ ...s, lim_max_call: e.target.value })} /></div>
              <div className="field"><label>Most people in one room</label><input type="number" min="2" value={s.lim_room_size ?? 30} onChange={e => setS({ ...s, lim_room_size: e.target.value })} /></div>
              <button type="submit" className="adm-save">Save limits</button>
            </form>
          </div>
          <div className="adm-panel" style={{ marginTop: 14 }}>
            <h4>Announcement banner</h4>
            <form onSubmit={save}>
              <div className="field"><label>Banner text</label><input value={s.announcement_text || ''} onChange={e => setS({ ...s, announcement_text: e.target.value })} placeholder="Announcement banner text" /></div>
              <button type="submit" className="adm-save">Publish banner</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

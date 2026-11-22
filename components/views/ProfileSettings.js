'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Ic } from '../icons';
import { api, toast } from '@/lib/toast';

const VIS = { onlyme: 'Only me', friends: 'Friends only', public: 'Public' };
const GOALS = ['Fluency', 'IELTS', 'Job interviews', 'Debate', 'Travel'];
const monthYear = d => new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
function RateBadge({ avg, count }) {
  if (!count) return null;
  return <span className="rate-badge"><span className="star">★</span>{Number(avg).toFixed(1)} · {count} ratings</span>;
}
function actWhen(d) {
  const day = new Date(d); const today = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === y.toDateString()) return 'Yesterday';
  return day.toLocaleDateString('en-GB', { weekday: 'long' });
}

function DetailsCard({ me, dash, streak, reload }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(null);
  const [uState, setUState] = useState('idle'); // idle | checking | ok | taken | invalid
  const [saving, setSaving] = useState(false);
  function begin() {
    setF({ username: me.username || '', phone: me.phone || '', phone_visibility: me.phone_visibility || 'friends', gender: me.gender || 'female', talk_preference: me.talk_preference || 'both', goal: me.goal || 'Fluency' });
    setUState('idle'); setEditing(true);
  }
  useEffect(() => {
    if (!editing || !f) return;
    const un = f.username.trim().replace(/^@/, '').toLowerCase();
    if (!un || un === (me.username || '')) { setUState('idle'); return; }
    if (!/^[a-z0-9_.]{3,40}$/.test(un)) { setUState('invalid'); return; }
    setUState('checking');
    const t = setTimeout(async () => {
      try { const d = await api(`/api/me/username?u=${encodeURIComponent(un)}`); setUState(d.available ? 'ok' : 'taken'); }
      catch { setUState('idle'); }
    }, 400);
    return () => clearTimeout(t);
  }, [editing, f?.username]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    if (saving || uState === 'taken' || uState === 'invalid' || uState === 'checking') return;
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { username: f.username, phone: f.phone, phone_visibility: f.phone_visibility, gender: f.gender, talk_preference: f.talk_preference, goal: f.goal } });
      toast('Details saved'); setEditing(false);
      if (reload) reload(); else window.location.reload();
    } catch (e) { toast(e.message); }
    setSaving(false);
  }
  const chipRow = (label, key, opts) => (
    <div className="pv-row"><span>{label}</span><span className="chips">{opts.map(([v, l]) => <button type="button" key={v} className={f[key] === v ? 'on' : ''} onClick={() => setF({ ...f, [key]: v })}>{l}</button>)}</span></div>
  );
  return (
    <div className={`pv-card ${editing ? 'pv-editing' : ''}`}>
      <div className="pv-card-head"><h4>Details</h4>{!editing && <button type="button" className="pv-edit-btn" onClick={begin}>Edit</button>}</div>
      {!editing ? (
        <>
          <div className="pv-row pv-noline"><span>Username</span><b>@{me.username}</b></div>
          <div className="pv-row"><span>Phone</span><b>{me.phone || '—'}</b></div>
          <div className="pv-row"><span>Phone visibility</span><b>{VIS[me.phone_visibility] || 'Friends only'}</b></div>
          <div className="pv-row"><span>Gender</span><b>{cap(me.gender) || '—'}</b></div>
          <div className="pv-row"><span>Wants to talk to</span><b>{me.talk_preference === 'both' ? 'Both' : cap(me.talk_preference) || '—'}</b></div>
          <div className="pv-row"><span>Goal</span><b>{me.goal || 'Fluency'}</b></div>
        </>
      ) : (
        <>
          <div className="pv-row pv-noline"><span>Username</span><span className="pv-uname"><input className="pv-in" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoComplete="username" />{uState === 'ok' && <span className="pv-uname-ic ok"><Ic n="check" size={15} /></span>}{(uState === 'taken' || uState === 'invalid') && <span className="pv-uname-ic bad"><Ic n="close" size={15} /></span>}{uState === 'checking' && <span className="pv-uname-ic wait">…</span>}</span></div>
          <div className="pv-row"><span>Phone</span><input className="pv-in" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></div>
          {chipRow('Phone visibility', 'phone_visibility', [['onlyme', 'Only me'], ['friends', 'Friends only'], ['public', 'Public']])}
          {chipRow('Gender', 'gender', [['female', 'Female'], ['male', 'Male']])}
          {chipRow('Wants to talk to', 'talk_preference', [['female', 'Women'], ['male', 'Men'], ['both', 'Both']])}
          <div className="pv-row"><span>Goal</span><select className="pv-in pv-sel" value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })}>{[...new Set([f.goal, ...GOALS])].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        </>
      )}
      <div className="pv-row"><span>Rooms joined</span><b>{dash?.rooms_joined ?? 0}</b></div>
      <div className="pv-row"><span>Current streak</span><b>{streak || 0} days</b></div>
      <div className="pv-row"><span>Member since</span><b>{monthYear(me.created_at)}</b></div>
      <div className="pv-row"><span>Speaks</span><b>Bengali</b></div>
      <div className="pv-row"><span>Learning</span><b>English</b></div>
      {editing && <div className="pv-detail-actions"><button type="button" className="btn-soft" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button><button type="button" className="btn-accent2" style={{ flex: 1 }} onClick={save} disabled={saving || uState === 'taken' || uState === 'invalid' || uState === 'checking'}>{saving ? 'Saving…' : 'Save changes'}</button></div>}
    </div>
  );
}

export function ProfileView({ me, dash, people, onCall, onLogout, reload }) {
  const fileRef = useRef(null);
  if (!me) return <div className="profileview"><p className="empty-note">Loading…</p></div>;
  const stats = { today: dash?.today?.minutes || 0, week: dash?.week_minutes || 0, all: dash?.all_minutes || 0, calls: dash?.all_calls || 0, streak: dash?.streak || 0 };
  const cats = dash?.rating_cats || { fluency: 0, speaking: 0, behaviour: 0 };
  async function pickPhoto(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const fd = new FormData(); fd.append('file', f);
      const res = await fetch('/api/upload', { method: 'POST', body: fd }); const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      await api('/api/me', { method: 'PATCH', body: { avatar: d.url } });
      toast('Profile picture updated'); window.location.reload();
    } catch (err) { toast(err.message); }
  }
  return (
    <div className="profileview">
      <div className="pv-head">
        <span className="pv-av-wrap">
          <Avatar user={me} cls="pv-av" />
          <button type="button" className="pv-photo-btn" title="Change profile picture" aria-label="Change profile picture" onClick={() => fileRef.current?.click()}><Ic n="camera" size={15} /></button>
          <input ref={fileRef} type="file" accept="image/*" hidden aria-label="Choose a new profile picture" onChange={pickPhoto} />
        </span>
        <div className="pv-id">
          <b>{me.name}</b>
          <small>@{me.username}</small>
          <span style={{ marginLeft: 8 }}><RateBadge avg={dash?.rating || 0} count={dash?.ratings_count || 0} /></span>
          {me.bio ? <p>{me.bio}</p> : null}
        </div>
        <button type="button" className="pv-edit" onClick={onLogout}>Log out</button>
      </div>
      <div className="pv-stats">
        <div><b>{stats.today || 0}</b><small>minutes talked today</small></div>
        <div><b>{stats.week || 0}</b><small>minutes talked this week</small></div>
        <div><b>{stats.all || 0}</b><small>minutes practised in total</small></div>
        <div><b>{stats.calls || 0}</b><small>calls completed</small></div>
      </div>
      <div className="pv-grid">
        <DetailsCard me={me} dash={dash} streak={stats.streak} reload={reload} />
        <div className="pv-card"><h4>Recent activity</h4>
          {(dash?.activity || []).slice(0, 4).map((a, i) => (
            <div className={`pv-act ${i === 0 ? 'pv-noline' : ''}`} key={i}>{a.title}<small>{a.sub} · {a.when}</small></div>
          ))}
          {(!dash?.activity || dash.activity.length === 0) && <p className="empty-note">No activity yet.</p>}
        </div>
        <div className="pv-card pv-my-rating"><h4>Your partner ratings</h4>
          <div className="pv-rate-head"><b>★ {Number(dash?.rating || 0).toFixed(1)}</b><small>from {dash?.ratings_count || 0} ratings · after 5+ min calls</small></div>
          <div className="pv-row"><span>Fluency</span><b>★ {Number(cats.fluency).toFixed(1)}</b></div>
          <div className="pv-row"><span>Speaking</span><b>★ {Number(cats.speaking).toFixed(1)}</b></div>
          <div className="pv-row"><span>Behaviour</span><b>★ {Number(cats.behaviour).toFixed(1)}</b></div>
        </div>
      </div>
      <ProfileForms me={me} />
    </div>
  );
}

function ProfileForms({ me }) {
  const [f, setF] = useState({ name: me.name, username: me.username || '', bio: me.bio || '', phone: me.phone || '', phone_visibility: me.phone_visibility || 'friends', gender: me.gender || 'female', talk_preference: me.talk_preference || 'both' });
  const [pw, setPw] = useState({ cur: '', next: '', conf: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState(false);
  async function saveProfile(e) {
    e.preventDefault();
    try { await api('/api/me', { method: 'PATCH', body: f }); toast('Profile saved'); } catch (err) { toast(err.message); }
  }
  async function savePassword(e) {
    e.preventDefault(); setPwErr(''); setPwOk(false);
    if (pw.next.length < 6) { setPwErr('New password must be at least 6 characters.'); return; }
    if (pw.next !== pw.conf) { setPwErr('New passwords do not match.'); return; }
    try { await api('/api/me', { method: 'PATCH', body: { current_password: pw.cur, new_password: pw.next } }); setPw({ cur: '', next: '', conf: '' }); setPwOk(true); } catch (err) { setPwErr(err.message); }
  }
  return (
    <div className="pv-edit-grid">
      <div className="pv-edit-card"><h4>Edit profile</h4>
        <form className="pv-edit-form" onSubmit={saveProfile}>
          <div className="field"><label>Your name</label><input autoComplete="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></div>
          <div className="field"><label>Username</label><input autoComplete="username" value={f.username} onChange={e => setF({ ...f, username: e.target.value })} required /></div>
          <div className="field"><label>Email</label><input type="email" value={me.email} disabled /></div>
          <div className="field"><label>Bio</label><textarea value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></div>
          <div className="field"><label>Phone number</label><input type="tel" autoComplete="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="field"><label>Who can see my phone number?</label><div className="chips">{[['onlyme', 'Only me'], ['friends', 'Friends only'], ['public', 'Public']].map(([v, l]) => <button type="button" key={v} className={f.phone_visibility === v ? 'on' : ''} onClick={() => setF({ ...f, phone_visibility: v })}>{l}</button>)}</div></div>
          <div className="field"><label>Your gender</label><div className="chips">{[['female', 'Female'], ['male', 'Male']].map(([v, l]) => <button type="button" key={v} className={f.gender === v ? 'on' : ''} onClick={() => setF({ ...f, gender: v })}>{l}</button>)}</div></div>
          <div className="field"><label>I want to talk to</label><div className="chips">{[['female', 'Women'], ['male', 'Men'], ['both', 'Both']].map(([v, l]) => <button type="button" key={v} className={f.talk_preference === v ? 'on' : ''} onClick={() => setF({ ...f, talk_pref: v })}>{l}</button>)}</div></div>
          <div className="modal-actions"><button type="submit" className="btn-accent2" style={{ flex: 1 }}>Save profile</button></div>
        </form>
      </div>
      <div className="pv-edit-card"><h4>Change password</h4>
        <form className="pv-pass-form" onSubmit={savePassword}>
          <div className="field"><label>Current password</label><input type="password" autoComplete="current-password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} required /></div>
          <div className="field"><label>New password</label><input type="password" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required /></div>
          <div className="field"><label>Confirm new password</label><input type="password" autoComplete="new-password" value={pw.conf} onChange={e => setPw({ ...pw, conf: e.target.value })} required /></div>
          {pwErr ? <p className="pass-err">{pwErr}</p> : null}
          {pwOk ? <p className="pv-pass-ok">Password changed successfully.</p> : null}
          <div className="modal-actions"><button type="submit" className="btn-dark" style={{ flex: 1 }}>Change password</button></div>
        </form>
      </div>
    </div>
  );
}

export function SettingsView({ me, subData, reload }) {
  const [f, setF] = useState(null);
  const [blocked, setBlocked] = useState([]);
  useEffect(() => { if (me) setF({ name: me.name, username: me.username || '', phone: me.phone || '', phone_visibility: me.phone_visibility || 'friends', gender: me.gender || 'female', talk_preference: me.talk_preference || 'both', goal: me.goal || 'Fluency', ai_reports: !!me.ai_reports_optin }); }, [me]);
  useEffect(() => { (async () => { try { const d = await api('/api/people'); setBlocked((d.people || []).filter(p => p.blocked_by_me)); } catch {} })(); }, []);
  if (!me || !f) return <div className="settingsview"><p className="empty-note">Loading…</p></div>;
  const curPkg = (subData?.packages || []).find(p => p.id === subData?.subscription?.package_id); const freq = curPkg?.ai_report_frequency;
  async function save(e) {
    e.preventDefault();
    try { await api('/api/me', { method: 'PATCH', body: { name: f.name, username: f.username, phone: f.phone, phone_visibility: f.phone_visibility, gender: f.gender, talk_pref: f.talk_preference, goal: f.goal, ai_reports_optin: f.ai_reports } }); toast('Settings saved'); reload?.(); } catch (err) { toast(err.message); }
  }
  async function unblock(p) {
    try { await api('/api/people/block', { method: 'POST', body: { user_id: p.id, block: false } }); setBlocked(b => b.filter(x => x.id !== p.id)); toast(`${p.name} unblocked`); reload?.(); } catch (err) { toast(err.message); }
  }
  return (
    <div className="settingsview">
      <div className="sv-card">
        <h3>Settings</h3>
        <form className="sv-form" onSubmit={save}>
          <div className="field"><label>Your name</label><input autoComplete="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></div>
          <div className="field"><label>Username</label><input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} required /></div>
          <div className="field"><label>Phone number</label><input type="tel" autoComplete="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="field"><label>Who can see my phone number?</label><div className="chips">{[['onlyme', 'Only me'], ['friends', 'Friends only'], ['public', 'Public']].map(([v, l]) => <button type="button" key={v} className={f.phone_visibility === v ? 'on' : ''} onClick={() => setF({ ...f, phone_visibility: v })}>{l}</button>)}</div></div>
          <div className="field"><label>Your gender</label><div className="chips">{[['female', 'Female'], ['male', 'Male']].map(([v, l]) => <button type="button" key={v} className={f.gender === v ? 'on' : ''} onClick={() => setF({ ...f, gender: v })}>{l}</button>)}</div></div>
          <div className="field"><label>I want to talk to</label><div className="chips">{[['female', 'Women'], ['male', 'Men'], ['both', 'Both']].map(([v, l]) => <button type="button" key={v} className={f.talk_preference === v ? 'on' : ''} onClick={() => setF({ ...f, talk_pref: v })}>{l}</button>)}</div></div>
          <div className="field"><label>I want to practise for</label><select value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })}>{GOALS.map(g => <option key={g}>{g}</option>)}</select></div>
          {freq && freq !== 'none' ? <div className="field"><label>AI reports</label><div className="chips">{[[true, 'On'], [false, 'Off']].map(([v, l]) => <button type="button" key={l} className={f.ai_reports === v ? 'on' : ''} onClick={() => setF({ ...f, ai_reports: v })}>{l}</button>)}</div><p className="field-note">Your {curPkg?.name} plan includes AI {freq} reports.</p></div> : null}
          <div className="modal-actions"><button type="submit" className="btn-accent2" style={{ flex: 1 }}>Save settings</button></div>
        </form>
        <div className="pv-card" style={{ marginTop: 18 }}><h4>Account</h4>
          <div className="pv-row pv-noline"><span>Member since</span><b>{monthYear(me.created_at)}</b></div>
          <div className="pv-row"><span>Speaks</span><b>Bengali</b></div>
          <div className="pv-row"><span>Learning</span><b>English</b></div>
        </div>
        <div className="pv-card blocked-card" style={{ marginTop: 18 }}><h4>Blocked people</h4>
          <div className="blocked-list">
            {blocked.length === 0 ? <p className="blocked-empty">You have not blocked anyone yet.</p> : blocked.map(p => (
              <div className="blocked-row" key={p.id}><Avatar user={p} /><span><b>{p.name}</b></span><button type="button" className="btn-soft sm" onClick={() => unblock(p)}>Unblock</button></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

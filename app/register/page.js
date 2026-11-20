'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, toast } from '@/lib/toast';
import { FacebookBtn, GoogleBtn } from '@/components/AuthBits';

function RegisterForm() {
  const sp = useSearchParams(); const plan = sp.get('plan');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', phone: '', phone_visibility: 'onlyme', gender: '', talk_preference: 'both', goal: 'Fluency', avatar: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function photo(file) {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    // Upload needs a session; for registration we keep the picture as an object URL is not durable — upload after account creation instead.
    set('avatar_file', file);
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const { avatar_file, ...body } = form;
      await api('/api/auth/register', { method: 'POST', body });
      if (avatar_file) { const fd = new FormData(); fd.append('file', avatar_file); const r = await fetch('/api/upload', { method: 'POST', body: fd }); const d = await r.json(); if (d.ok) await api('/api/me', { method: 'PATCH', body: { avatar: d.url } }); }
      window.location.href = plan ? `/app` : '/app';
    } catch (err) { toast(err.message); setBusy(false); }
  }
  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">talk<i>.</i></div>
      <h3>Create your account</h3>
      <form onSubmit={submit}>
        <div className="field"><label>Your name</label><input placeholder="Your name" autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
        <div className="field"><label>Username</label><input placeholder="Username" autoComplete="username" value={form.username} onChange={e => set('username', e.target.value)} required /></div>
        <div className="field"><label>Email</label><input type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
        <div className="field"><label>Password</label><input type="password" placeholder="Create a password" value={form.password} onChange={e => set('password', e.target.value)} required /></div>
        <div className="field"><label>Your gender</label><div className="chips"><button type="button" className={form.gender === 'female' ? 'on' : ''} onClick={() => set('gender', 'female')}>Female</button><button type="button" className={form.gender === 'male' ? 'on' : ''} onClick={() => set('gender', 'male')}>Male</button></div></div>
        <div className="field"><label>Phone number</label><input type="tel" placeholder="+880 1XXX-XXXXXX" autoComplete="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div className="field"><label>Who can see my phone number?</label><div className="chips"><button type="button" className={form.phone_visibility === 'onlyme' ? 'on' : ''} onClick={() => set('phone_visibility', 'onlyme')}>Only me</button><button type="button" className={form.phone_visibility === 'friends' ? 'on' : ''} onClick={() => set('phone_visibility', 'friends')}>Friends only</button><button type="button" className={form.phone_visibility === 'public' ? 'on' : ''} onClick={() => set('phone_visibility', 'public')}>Public</button></div></div>
        <div className="field"><label>Profile picture</label><input type="file" accept="image/*" onChange={e => photo(e.target.files?.[0])} /></div>
        <div className="field"><label>I want to talk to</label><div className="chips"><button type="button" className={form.talk_preference === 'female' ? 'on' : ''} onClick={() => set('talk_preference', 'female')}>Women</button><button type="button" className={form.talk_preference === 'male' ? 'on' : ''} onClick={() => set('talk_preference', 'male')}>Men</button><button type="button" className={form.talk_preference === 'both' ? 'on' : ''} onClick={() => set('talk_preference', 'both')}>Both</button></div></div>
        <div className="field"><label>I want to practise for</label><select value={form.goal} onChange={e => set('goal', e.target.value)}><option>Fluency</option><option>IELTS</option><option>Job interviews</option><option>Debate</option><option>Travel</option></select></div>
        <div className="modal-actions"><button type="submit" className="btn-accent2" style={{ flex: 1 }} disabled={busy}>Create account →</button></div>
      </form>
      <div className="social-divider"><span>or continue with</span></div>
      <div className="social-row">
        <button type="button" className="btn-social" onClick={() => toast('Social sign-in is not connected yet')}><FacebookBtn /></button>
        <button type="button" className="btn-social" onClick={() => toast('Social sign-in is not connected yet')}><GoogleBtn /></button>
      </div>
      <p className="auth-alt">Already have an account? <Link className="linklike" href="/login">Log in →</Link></p>
      <Link className="adm-back auth-back" href="/">← Back to app</Link>
    </div></div>
  );
}
export default function RegisterPage() { return <Suspense><RegisterForm /></Suspense>; }

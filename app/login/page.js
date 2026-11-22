'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, toast } from '@/lib/toast';
import { FacebookBtn, GoogleBtn } from '@/components/AuthBits';

export default function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  // Already logged in? The login page is the wrong place — go to the app.
  useEffect(() => { (async () => { try { const r = await api('/api/me'); if (r?.user) { window.location.replace('/app'); return; } } catch {} setChecking(false); })(); }, []);
  if (checking) return (<div className="auth-wrap"><div className="auth-card"><div className="auth-logo">talk<i>.</i></div></div></div>);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/api/auth/login', { method: 'POST', body: { email, password } }); window.location.href = '/app'; }
    catch (err) { toast(err.message); setBusy(false); }
  }
  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">talk<i>.</i></div>
      <h3>Welcome back</h3>
      <form onSubmit={submit}>
        <div className="field"><label>Email address</label><input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="field"><label>Password</label><input type="password" placeholder="Your password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <div className="modal-actions"><button type="submit" className="btn-accent2" style={{ flex: 1 }} disabled={busy}>Log in &amp; continue →</button></div>
      </form>
      <div className="social-divider"><span>or continue with</span></div>
      <div className="social-row">
        <button type="button" className="btn-social" onClick={() => toast('Social sign-in is not connected yet')}><FacebookBtn /></button>
        <button type="button" className="btn-social" onClick={() => toast('Social sign-in is not connected yet')}><GoogleBtn /></button>
      </div>
      <p className="auth-alt">New to talk.? <Link className="linklike" href="/register">Create an account →</Link></p>
      <Link className="adm-back auth-back" href="/">← Back to app</Link>
    </div></div>
  );
}

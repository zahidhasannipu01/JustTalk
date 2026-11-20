'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, toast } from '@/lib/toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  async function submit(e) { e.preventDefault(); try { await api('/api/admin/login', { method: 'POST', body: { email, password } }); window.location.href = '/admin'; } catch (err) { toast(err.message); } }
  return (
    <div className="auth-wrap"><div className="auth-card" style={{ borderColor: '#101815' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ width: 48, height: 48, borderRadius: 14, background: '#101815', color: '#fff', display: 'grid', placeItems: 'center' }}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.4 7 9 4.1-1.6 7-4.7 7-9V5.8Z" /><path d="m9 11.6 2.2 2.2L15.4 9.6" /></svg></span>
        <span><b style={{ fontSize: 17, display: 'block', lineHeight: 1.2 }}>Super admin</b><small style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>Owner access only</small></span>
      </div>
      <h3>Admin sign in</h3>
      <form onSubmit={submit}>
        <div className="field"><label>Admin email</label><input type="email" placeholder="owner@bangonix.app" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <div className="field"><label>Admin password</label><input type="password" placeholder="Your admin password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <div className="modal-actions"><button type="submit" className="btn-dark" style={{ flex: 1 }}>Enter control panel →</button></div>
      </form>
      <Link className="adm-back auth-back" href="/app">← Back to app</Link>
    </div></div>
  );
}

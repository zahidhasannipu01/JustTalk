import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me');
export const SESSION_COOKIE = 'talk_session';
export const ADMIN_COOKIE = 'talk_admin';

export async function makeSession(payload, cookieName = SESSION_COOKIE) {
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret);
  const c = await cookies();
  c.set(cookieName, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return token;
}
export async function readSession(cookieName = SESSION_COOKIE) {
  const c = await cookies();
  const t = c.get(cookieName)?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, secret); return payload; } catch { return null; }
}
export async function clearSession(cookieName = SESSION_COOKIE) {
  const c = await cookies();
  c.set(cookieName, '', { httpOnly: true, path: '/', maxAge: 0 });
}
export async function currentUser() {
  const s = await readSession(SESSION_COOKIE);
  return s ? { id: s.uid, email: s.email, name: s.name } : null;
}
export async function currentAdmin() {
  const s = await readSession(ADMIN_COOKIE);
  return s && s.admin ? { id: s.aid, email: s.email } : null;
}

import bcrypt from 'bcryptjs';
import { q, q1 } from '@/lib/db';
import { makeSession } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

export async function POST(req) {
  const b = await req.json().catch(() => null);
  if (!b?.email || !b?.password) return fail('Email and password are required');
  const u = await q1('SELECT * FROM users WHERE email = ?', [b.email]);
  if (!u || !(await bcrypt.compare(b.password, u.password_hash))) return fail('Email or password is incorrect', 401);
  if (u.suspended) return fail('This account is suspended', 403);
  await q('UPDATE users SET is_online = 1, last_seen_at = NOW(), last_ip = ? WHERE id = ?', [req.headers.get('x-forwarded-for') || '', u.id]);
  await makeSession({ uid: u.id, email: u.email, name: u.name });
  return ok({ user: { id: u.id, name: u.name, email: u.email } });
}

import bcrypt from 'bcryptjs';
import { q1 } from '@/lib/db';
import { makeSession, ADMIN_COOKIE } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function POST(req) {
  const b = await req.json().catch(() => null);
  if (!b?.email || !b?.password) return fail('Email and password are required');
  const a = await q1('SELECT * FROM admin_users WHERE email = ?', [b.email]);
  if (!a || !(await bcrypt.compare(b.password, a.password_hash))) return fail('Email or password is incorrect', 401);
  await makeSession({ admin: true, aid: a.id, email: a.email }, ADMIN_COOKIE);
  return ok({ admin: { id: a.id, email: a.email } });
}

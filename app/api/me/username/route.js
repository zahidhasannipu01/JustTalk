import { q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

// Live username availability for the profile Details editor: the UI shows
// a tick while typing when the name is free and a cross when it is taken
// (same rules the PATCH /api/me save enforces).
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const raw = new URL(req.url).searchParams.get('u') || '';
  const un = raw.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{3,40}$/.test(un)) return ok({ available: false, reason: 'invalid' });
  const taken = await q1('SELECT id FROM users WHERE username = ? AND id != ?', [un, me.id]);
  return ok({ available: !taken, reason: taken ? 'taken' : 'free' });
}

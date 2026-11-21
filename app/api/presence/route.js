import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

// Real presence: the open app beats every ~25s. A user counts as online only
// while their app is actually open (last beat within 90 seconds) — never just
// because the account exists or logged in once. { offline: 1 } (sent via
// navigator.sendBeacon on page hide) clears the flag immediately.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => ({}));
  if (b?.offline) await q('UPDATE users SET is_online = 0, last_seen_at = NOW() WHERE id = ?', [me.id]);
  else await q('UPDATE users SET is_online = 1, last_seen_at = NOW() WHERE id = ?', [me.id]);
  return ok({});
}

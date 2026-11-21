import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

// Remove an accepted friendship (both directions — a pair can hold a row
// each way). The person stays in the caller's People list as a past call
// partner, with the Add friend button back in place.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  if (!target || target === me.id) return fail('Invalid person');
  await q("DELETE FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))", [me.id, target, target, me.id]);
  return ok();
}

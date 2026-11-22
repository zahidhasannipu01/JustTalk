import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { notify } from '@/lib/notify';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const from = Number(b?.user_id);
  if (!from) return fail('Invalid person');
  if (b.accept) {
    await q("UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'", [from, me.id]);
    // The requester hears about it at once: the notification push carries
    // the full row, so their bell and People list update in place.
    await notify(from, { kind: 'friend_accepted', actor_id: me.id, title: me.name, body: 'Accepted your friend request' });
  }
  else await q("DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'", [from, me.id]);
  return ok();
}

import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubPush } from '@/lib/hub';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const from = Number(b?.user_id);
  if (!from) return fail('Invalid person');
  if (b.accept) {
    await q("UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'", [from, me.id]);
    // The requester hears about it at once: a notification, and a live refresh
    // so the new person (with direct call) appears in their People immediately.
    await q("INSERT INTO notifications (user_id, kind, actor_id, title, body) VALUES (?, 'friend_accepted', ?, ?, ?)", [from, me.id, me.name, 'Accepted your friend request']);
    hubPush(from, { t: 'notification', kind: 'friend_accepted', from: me.id });
  }
  else await q("DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'", [from, me.id]);
  return ok();
}

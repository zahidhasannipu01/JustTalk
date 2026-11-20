import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  if (!target || target === me.id) return fail('Invalid person');
  const u = await q1('SELECT id FROM users WHERE id = ? AND suspended = 0', [target]); if (!u) return fail('Person not found', 404);
  const existing = await q1('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)', [me.id, target, target, me.id]);
  if (existing) return ok({ status: existing.status });
  await q("INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')", [me.id, target]);
  await q("INSERT INTO notifications (user_id, kind, actor_id, title, body) VALUES (?, 'message', ?, ?, ?)", [target, me.id, me.name, 'Sent you a friend request']);
  return ok({ status: 'pending' });
}

import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function GET() { const me = await currentUser(); if (!me) return fail('Not signed in', 401); const rows = await q('SELECT n.*, u.name AS actor_name, u.avatar AS actor_avatar FROM notifications n LEFT JOIN users u ON u.id = n.actor_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 100', [me.id]); return ok({ notifications: rows }); }
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null);
  // Targeted mark-read for one kind (e.g. { kind: 'subscription_reminder' }),
  // or for one sender's message notifications ({ actor_id }) when a message
  // notification is clicked open; no body marks everything read.
  if (b && b.actor_id) {
    await q("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND actor_id = ? AND kind = 'message' AND is_read = 0", [me.id, Number(b.actor_id)]);
  } else if (b && typeof b.kind === 'string' && b.kind) {
    await q('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND kind = ? AND is_read = 0', [me.id, b.kind]);
  } else {
    await q('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [me.id]);
  }
  return ok();
}

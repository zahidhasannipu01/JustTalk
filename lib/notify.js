import { q, q1 } from '@/lib/db';
import { hubPush } from '@/lib/hub';

// The single place notifications are created. The row is inserted AND the
// full row is pushed over the socket, so an online client patches its bell,
// tray and badge in place — the standard event-carries-data pattern —
// instead of refetching its lists. A user who is offline simply picks the
// row up on their next load; nothing is lost.
export async function notify(userId, { kind, actor_id = null, title, body }) {
  const r = await q('INSERT INTO notifications (user_id, kind, actor_id, title, body) VALUES (?,?,?,?,?)', [userId, kind, actor_id, title, body]);
  let actor_name = null, actor_avatar = null;
  if (actor_id) {
    const a = await q1('SELECT name, avatar FROM users WHERE id = ?', [actor_id]);
    if (a) { actor_name = a.name; actor_avatar = a.avatar; }
  }
  const n = { id: Number(r.insertId), user_id: userId, kind, actor_id, title, body, is_read: 0, created_at: new Date().toISOString(), actor_name, actor_avatar };
  hubPush(userId, { t: 'notification', notification: n });
  return n;
}

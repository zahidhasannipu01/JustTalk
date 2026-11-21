import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubPush, hubIsViewing } from '@/lib/hub';
async function guard(me, id) {
  const c = await q1('SELECT * FROM conversations WHERE id = ?', [id]);
  if (!c || (c.user_a !== me.id && c.user_b !== me.id)) return null;
  return c;
}
export async function GET(req, { params }) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const { id } = await params; const c = await guard(me, Number(id)); if (!c) return fail('Conversation not found', 404);
  const rows = await q('SELECT id, sender_id, kind, ciphertext AS text, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 500', [c.id]);
  await q('UPDATE messages SET read_at = NOW() WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL', [c.id, me.id]);
  return ok({ messages: rows, other_id: c.user_a === me.id ? c.user_b : c.user_a });
}
export async function POST(req, { params }) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const { id } = await params; const c = await guard(me, Number(id)); if (!c) return fail('Conversation not found', 404);
  const other = c.user_a === me.id ? c.user_b : c.user_a;
  const blocked = await q1('SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1', [me.id, other, other, me.id]);
  if (blocked) return fail('Chat is disabled', 403);
  const b = await req.json().catch(() => null);
  // kind 'photo_ref' carries no server-stored image: photos move phone-to-phone only, never stored here.
  const kind = b?.kind === 'photo_ref' ? 'photo_ref' : 'text';
  if (kind === 'text' && !b?.ciphertext) return fail('Empty message');
  const r = await q('INSERT INTO messages (conversation_id, sender_id, kind, ciphertext) VALUES (?,?,?,?)', [c.id, me.id, kind, kind === 'text' ? String(b.ciphertext).slice(0, 4000) : null]);
  // Live: the other side's chat list (latest message + unread) and any open
  // conversation update instantly over the socket — no polling.
  hubPush(other, { t: 'chat-message', conversation_id: c.id, from: me.id, kind });
  // Message notifications, Facebook-style: NONE while the recipient is
  // looking at this very conversation, and only ever ONE live row per
  // sender — a new message replaces the previous unread one, so the row
  // always carries the latest text and time.
  if (!hubIsViewing(other, c.id)) {
    await q("DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND kind = 'message' AND is_read = 0", [other, me.id]);
    await q("INSERT INTO notifications (user_id, kind, actor_id, title, body) VALUES (?, 'message', ?, ?, ?)", [other, me.id, me.name, kind === 'text' ? String(b.ciphertext).slice(0, 120) : 'Sent a photo']);
    hubPush(other, { t: 'notification', kind: 'message', from: me.id });
  }
  return ok({ id: Number(r.insertId) });
}

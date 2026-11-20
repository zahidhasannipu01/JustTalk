import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { shapeUser, RATING_SQL, RATING_CATS_SQL, parseCats } from '@/lib/publicUser';
// Conversations exist only between connected people. POST opens/gets a conversation with a friend.
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const friends = await q("SELECT requester_id, addressee_id FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)", [me.id, me.id]);
  for (const f of friends) { const a = Math.min(f.requester_id, f.addressee_id), b2 = Math.max(f.requester_id, f.addressee_id); await q('INSERT IGNORE INTO conversations (user_a, user_b) VALUES (?, ?)', [a, b2]); }
  const rows = await q(`SELECT c.id, CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END AS other_id FROM conversations c WHERE c.user_a = ? OR c.user_b = ? ORDER BY c.id DESC`, [me.id, me.id, me.id]);
  const out = [];
  for (const r of rows) {
    const u = await q1(`SELECT u.*, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u WHERE u.id = ?`, [r.other_id]);
    const last = await q1('SELECT kind, ciphertext AS text, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1', [r.id]);
    const [un] = await q('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL', [r.id, me.id]);
    const blocked = await q1('SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1', [me.id, r.other_id, r.other_id, me.id]);
    out.push({ id: r.id, other: u ? shapeUser(parseCats(u), me.id, true) : null, last, unread: un.n, chat_disabled: !!blocked });
  }
  // Most recent conversation first (preview order).
  out.sort((a, b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0));
  return ok({ conversations: out });
}
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  const [a, bb] = me.id < target ? [me.id, target] : [target, me.id];
  const existing = await q1('SELECT id FROM conversations WHERE user_a = ? AND user_b = ?', [a, bb]);
  if (existing) return ok({ id: existing.id });
  const r = await q('INSERT INTO conversations (user_a, user_b) VALUES (?, ?)', [a, bb]);
  return ok({ id: r.insertId });
}

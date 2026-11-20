import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { shapeUser, RATING_SQL, RATING_CATS_SQL, parseCats } from '@/lib/publicUser';

// People = accepted connections only (privacy rule). Search finds a real person by email or name for the Add popup.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const search = new URL(req.url).searchParams.get('search');
  if (search) {
    const like = `%${search}%`;
    const rows = await q(`SELECT u.*, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u WHERE u.id != ? AND u.suspended = 0 AND (u.email = ? OR u.name LIKE ?) LIMIT 10`, [me.id, search, like]);
    const out = [];
    for (const u of rows) { const fr = await isFriend(me.id, u.id); out.push({ ...shapeUser(parseCats(u), me.id, fr), is_friend: fr }); }
    return ok({ results: out });
  }
  const rows = await q(`SELECT u.*, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u JOIN friendships f ON ((f.requester_id = ? AND f.addressee_id = u.id) OR (f.addressee_id = ? AND f.requester_id = u.id)) AND f.status = 'accepted' WHERE u.id != ?`, [me.id, me.id, me.id]);
  const blockedByMe = new Set((await q('SELECT blocked_id FROM blocks WHERE blocker_id = ?', [me.id])).map(r => r.blocked_id));
  const blockedMe = new Set((await q('SELECT blocker_id FROM blocks WHERE blocked_id = ?', [me.id])).map(r => r.blocker_id));
  const people = rows.map(u => ({ ...shapeUser(parseCats(u), me.id, true), blocked_by_me: blockedByMe.has(u.id), blocked_me: blockedMe.has(u.id) }));
  const requests = await q(`SELECT u.id, u.name, u.username, u.note, u.avatar, u.is_online FROM users u JOIN friendships f ON f.requester_id = u.id WHERE f.addressee_id = ? AND f.status = 'pending'`, [me.id]);
  return ok({ people, requests });
}
export async function isFriend(a, b) {
  const rows = await q("SELECT 1 FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) LIMIT 1", [a, b, b, a]);
  return rows.length > 0;
}

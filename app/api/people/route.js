import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { shapeUser, RATING_SQL, RATING_CATS_SQL, parseCats } from '@/lib/publicUser';

// People = accepted connections only (privacy rule). Search finds a real person by email or name for the Add popup.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const search = new URL(req.url).searchParams.get('search');
  if (search) {
    const like = `%${search}%`;
    const rows = await q(`SELECT u.*, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS online_now, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u WHERE u.id != ? AND u.suspended = 0 AND (u.email = ? OR u.name LIKE ?) LIMIT 10`, [me.id, search, like]);
    const out = [];
    for (const u of rows) { const fr = await isFriend(me.id, u.id); out.push({ ...shapeUser(parseCats(u), me.id, fr), is_friend: fr }); }
    return ok({ results: out });
  }
  const rows = await q(`SELECT u.*, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS online_now, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u JOIN friendships f ON ((f.requester_id = ? AND f.addressee_id = u.id) OR (f.addressee_id = ? AND f.requester_id = u.id)) AND f.status = 'accepted' WHERE u.id != ?`, [me.id, me.id, me.id]);
  const blockedByMe = new Set((await q('SELECT blocked_id FROM blocks WHERE blocker_id = ?', [me.id])).map(r => r.blocked_id));
  const blockedMe = new Set((await q('SELECT blocker_id FROM blocks WHERE blocked_id = ?', [me.id])).map(r => r.blocker_id));
  // One entry per person, always: the JOIN can return the same user twice when
  // two friendship rows exist for the pair (one in each direction).
  const seenIds = new Set();
  const people = rows.filter(u => { if (seenIds.has(u.id)) return false; seenIds.add(u.id); return true; }).map(u => ({ ...shapeUser(parseCats(u), me.id, true), blocked_by_me: blockedByMe.has(u.id), blocked_me: blockedMe.has(u.id), is_friend: true, request_sent: false }));
  // The People page also lists past 1-to-1 call partners who are not
  // friends (yet, or any more): each row knows its state, so it can offer
  // Add friend — or Unfriend for the friends above. `people` itself stays
  // friends-only for the sidebar and the privacy rules built on it.
  const sentPending = new Set((await q("SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'pending'", [me.id])).map(r => r.addressee_id));
  const everyone = [...people];
  const haveIds = new Set(people.map(p => p.id));
  const partnerIds = (await q('SELECT DISTINCT CASE WHEN caller_id = ? THEN callee_id ELSE caller_id END AS uid FROM calls WHERE (caller_id = ? OR callee_id = ?) AND callee_id IS NOT NULL AND room_id IS NULL', [me.id, me.id, me.id])).map(r => r.uid);
  for (const uid of partnerIds) {
    if (!uid || uid === me.id || haveIds.has(uid)) continue;
    const u = await q1(`SELECT u.*, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS online_now, ${RATING_SQL}, ${RATING_CATS_SQL} FROM users u WHERE u.id = ? AND u.suspended = 0`, [uid]);
    if (u) { everyone.push({ ...shapeUser(parseCats(u), me.id, false), blocked_by_me: blockedByMe.has(u.id), blocked_me: blockedMe.has(u.id), is_friend: false, request_sent: sentPending.has(u.id) }); haveIds.add(uid); }
  }
  const requests = await q(`SELECT u.id, u.name, u.username, u.note, u.avatar, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS is_online FROM users u JOIN friendships f ON f.requester_id = u.id WHERE f.addressee_id = ? AND f.status = 'pending'`, [me.id]);
  return ok({ people, requests, everyone });
}
export async function isFriend(a, b) {
  const rows = await q("SELECT 1 FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) LIMIT 1", [a, b, b, a]);
  return rows.length > 0;
}

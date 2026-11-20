import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { livekitToken, livekitUrl } from '@/lib/livekit';

// Direct call to a person (People / Profile / Chat call buttons). Blocked-by-them => the preview's modal case.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  const u = await q1('SELECT id, name, avatar FROM users WHERE id = ? AND suspended = 0', [target]);
  if (!u) return fail('Person not found', 404);
  const blockedMe = await q1('SELECT 1 AS x FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [target, me.id]);
  if (blockedMe) return ok({ blocked: true });
  const blockedByMe = await q1('SELECT 1 AS x FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [me.id, target]);
  if (blockedByMe) return fail('You have blocked this person', 403);
  const kind = b?.kind === 'video' ? 'video' : 'audio';
  const lkRoom = `call-${me.id}-${target}-${Date.now()}`;
  const r = await q("INSERT INTO calls (caller_id, callee_id, livekit_room, kind, status, started_at) VALUES (?, ?, ?, ?, 'active', NOW())", [me.id, target, lkRoom, kind]);
  const token = await livekitToken(me.id, me.name, lkRoom);
  return ok({ token, url: livekitUrl(), call_id: r.insertId, room_name: lkRoom, partner: { id: u.id, name: u.name, avatar: u.avatar } });
}

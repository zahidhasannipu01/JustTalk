import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubPush, hubUserInCall } from '@/lib/hub';

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
  // Busy: they are already talking — inside a room meeting or a live 1-to-1
  // call (direct or random), or another call is ringing them right now. The
  // socket channel is the live truth for talking; a fresh ringing row covers
  // the gap before the callee's window joins its channel.
  const ringing = await q1("SELECT 1 AS x FROM calls WHERE (caller_id = ? OR callee_id = ?) AND source != 'room' AND status = 'ringing' AND created_at > NOW() - INTERVAL 60 SECOND LIMIT 1", [target, target]);
  if (ringing || hubUserInCall(target)) return ok({ busy: true });
  const kind = b?.kind === 'video' ? 'video' : 'audio';
  const channel = `call-${me.id}-${target}-${Date.now()}`;
  const r = await q("INSERT INTO calls (caller_id, callee_id, channel, kind, status, source) VALUES (?, ?, ?, ?, 'ringing', 'direct')", [me.id, target, channel, kind]);
  const meU = await q1('SELECT avatar FROM users WHERE id = ?', [me.id]);
  hubPush(target, { t: 'incoming-call', call_id: r.insertId, room_name: channel, kind, from_match: false, partner: { id: me.id, name: me.name, avatar: meU?.avatar || null } });
  return ok({ call_id: r.insertId, room_name: channel, ringing: true, partner: { id: u.id, name: u.name, avatar: u.avatar } });
}

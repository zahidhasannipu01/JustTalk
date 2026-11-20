import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
// Rating works only when the call lasted at least 5 minutes.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const call = await q1('SELECT * FROM calls WHERE id = ?', [Number(b?.call_id)]);
  if (!call) return fail('Call not found', 404);
  if ((call.duration_seconds || 0) < 300) return fail('Ratings open after a call of at least 5 minutes', 403);
  const ratee = call.caller_id === me.id ? call.callee_id : call.caller_id;
  if (!ratee) return fail('No partner to rate');
  const v = n => Math.min(5, Math.max(1, Number(n) || 0));
  await q('INSERT INTO ratings (call_id, rater_id, ratee_id, fluency, speaking, behaviour) VALUES (?,?,?,?,?,?)', [call.id, me.id, ratee, v(b.fluency), v(b.speaking), v(b.behaviour)]);
  // A rated call also connects the two people (friend request accepted flow in the preview).
  await q("INSERT IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'accepted')", [me.id, ratee]);
  return ok();
}

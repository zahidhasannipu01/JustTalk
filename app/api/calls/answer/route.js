import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubPush } from '@/lib/hub';
import { logCallInChat } from '@/lib/calllog';

// Accept / decline / cancel a ringing 1-to-1 call. The other side hears about
// it instantly over the socket — nobody polls for the answer.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null);
  const call = await q1('SELECT * FROM calls WHERE id = ?', [Number(b?.call_id)]);
  if (!call || call.room_id) return fail('Call not found', 404);
  const isCaller = call.caller_id === me.id;
  const isCallee = call.callee_id === me.id;
  if (!isCaller && !isCallee) return fail('Not your call', 403);
  if (call.status !== 'ringing') return ok({ status: call.status }); // already settled

  if (b?.action === 'accept' && isCallee) {
    await q("UPDATE calls SET status = 'active', started_at = NOW() WHERE id = ?", [call.id]);
    hubPush(call.caller_id, { t: 'call-accepted', call_id: call.id, room_name: call.channel });
    return ok({ status: 'active' });
  }
  if (b?.action === 'decline' && isCallee) {
    await q("UPDATE calls SET status = 'declined', ended_at = NOW() WHERE id = ?", [call.id]);
    await logCallInChat(call, 'missed', 0);
    // A matched searcher who declines goes back into the pool for the next match.
    if (call.source === 'match') await q("INSERT INTO call_queue (user_id, want_gender, kind) VALUES (?, 'any', ?) ON DUPLICATE KEY UPDATE kind = VALUES(kind)", [me.id, call.kind]);
    hubPush(call.caller_id, { t: 'call-declined', call_id: call.id });
    return ok({ status: 'declined' });
  }
  if (b?.action === 'cancel' && isCaller) {
    await q("UPDATE calls SET status = 'cancelled', ended_at = NOW() WHERE id = ?", [call.id]);
    await logCallInChat(call, 'missed', 0);
    // The person who was searching goes back into the pool too.
    if (call.source === 'match' && call.callee_id) await q("INSERT INTO call_queue (user_id, want_gender, kind) VALUES (?, 'any', ?) ON DUPLICATE KEY UPDATE kind = VALUES(kind)", [call.callee_id, call.kind]);
    if (call.callee_id) hubPush(call.callee_id, { t: 'call-cancelled', call_id: call.id });
    return ok({ status: 'cancelled' });
  }
  return fail('Invalid action', 400);
}

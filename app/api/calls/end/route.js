import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logCallInChat } from '@/lib/calllog';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const call = await q1('SELECT * FROM calls WHERE id = ?', [Number(b?.call_id)]);
  if (!call) return fail('Call not found', 404);
  const partner_id = call.caller_id === me.id ? call.callee_id : call.caller_id;
  // Both browsers report the end of the same call. Only the FIRST report may
  // close the call and credit minutes — a second one just reads the result,
  // so a 5-minute call can never be counted as 10.
  if (call.status === 'ended') return ok({ duration_seconds: call.duration_seconds || 0, can_rate: (call.duration_seconds || 0) >= 300 && !!call.callee_id, partner_id });
  const secs = Math.max(0, Math.floor((Date.now() - new Date(call.started_at || call.created_at).getTime()) / 1000));
  const upd = await q("UPDATE calls SET status = 'ended', ended_at = NOW(), duration_seconds = ? WHERE id = ? AND status <> 'ended'", [secs, call.id]);
  if (upd.affectedRows > 0 && call.started_at) {
    // Each participant is credited the call's own duration, exactly once —
    // never both sides' minutes added together.
    const mins = Math.round(secs / 60);
    if (mins > 0) for (const uid of [call.caller_id, call.callee_id].filter(Boolean)) {
      await q('INSERT INTO user_daily_stats (user_id, day, minutes, calls) VALUES (?, CURDATE(), ?, 1) ON DUPLICATE KEY UPDATE minutes = minutes + VALUES(minutes), calls = calls + 1', [uid, mins]);
    }
    // The call lands in the pair's chat as a Messenger-style entry (type +
    // duration) — only on this first, settling report.
    await logCallInChat(call, 'done', secs);
  }
  return ok({ duration_seconds: secs, can_rate: secs >= 300 && !!call.callee_id, partner_id });
}

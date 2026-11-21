import { q, q1 } from '@/lib/db';
import { hubPush } from '@/lib/hub';

// Messenger-style call entries inside the pair's chat: a completed call
// with its duration and type, or a missed call. Written exactly once, when
// the call settles, and only into a conversation that already exists (a
// call made from chat always has one). Both sides get a live push, so an
// open chat shows the entry the moment the call ends.
export async function logCallInChat(call, state, durationSecs) {
  try {
    if (!call?.callee_id || call.room_id) return;
    const conv = await q1('SELECT id FROM conversations WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?)', [call.caller_id, call.callee_id, call.callee_id, call.caller_id]);
    if (!conv) return;
    const payload = JSON.stringify({ k: call.kind === 'video' ? 'video' : 'audio', s: state, d: Math.max(0, Math.floor(durationSecs || 0)) });
    await q("INSERT INTO messages (conversation_id, sender_id, kind, ciphertext) VALUES (?, ?, 'call_log', ?)", [conv.id, call.caller_id, payload]);
    hubPush(call.caller_id, { t: 'chat-message', conversation_id: conv.id, from: call.caller_id, kind: 'call_log' });
    hubPush(call.callee_id, { t: 'chat-message', conversation_id: conv.id, from: call.caller_id, kind: 'call_log' });
  } catch {}
}

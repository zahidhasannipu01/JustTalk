import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { currentSubscription } from '@/lib/subscription';
import { livekitToken, livekitUrl } from '@/lib/livekit';

// Start Calling: random match on the chosen gender; if nobody matches, join ANYONE looking — no waiting.
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const [row] = await q("SELECT COUNT(*) AS anyone, SUM(gender = 'female') AS female, SUM(gender = 'male') AS male FROM users WHERE id != ? AND suspended = 0 AND is_online = 1", [me.id]);
  return ok({ counts: { any: Number(row.anyone) || 0, female: Number(row.female) || 0, male: Number(row.male) || 0 } });
}
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => ({}));
  const want = ['female', 'male'].includes(b?.gender) ? b.gender : 'any';
  const kind = b?.kind === 'video' ? 'video' : 'audio';
  // Daily free-plan limit check (Free = 15 minutes per day).
  const sub = await currentSubscription(me.id);
  if (sub?.daily_call_minutes != null) {
    const t = await q1('SELECT minutes FROM user_daily_stats WHERE user_id = ? AND day = CURDATE()', [me.id]);
    if (t && t.minutes >= sub.daily_call_minutes) return fail('Your free minutes for today are used up', 403);
  }
  // If a partner already matched with me, join that call instead of queueing again.
  const incoming = await q1("SELECT * FROM calls WHERE (caller_id = ? OR callee_id = ?) AND room_id IS NULL AND status IN ('ringing','active') AND created_at >= NOW() - INTERVAL 2 MINUTE ORDER BY id DESC LIMIT 1", [me.id, me.id]);
  if (incoming) {
    const partnerU = await q1('SELECT id, name, avatar FROM users WHERE id = ?', [incoming.caller_id === me.id ? incoming.callee_id : incoming.caller_id]);
    const token = await livekitToken(me.id, me.name, incoming.livekit_room);
    return ok({ waiting: false, token, url: livekitUrl(), call_id: incoming.id, room_name: incoming.livekit_room, partner: partnerU });
  }
  await q('DELETE FROM call_queue WHERE user_id = ?', [me.id]);
  let partner = await q1(`SELECT qu.user_id, u.name, u.gender, u.avatar FROM call_queue qu JOIN users u ON u.id = qu.user_id WHERE qu.user_id != ? AND u.suspended = 0 AND NOT EXISTS (SELECT 1 FROM blocks bl WHERE (bl.blocker_id = ? AND bl.blocked_id = qu.user_id) OR (bl.blocker_id = qu.user_id AND bl.blocked_id = ?)) ${want !== 'any' ? 'AND u.gender = ?' : ''} ORDER BY RAND() LIMIT 1`, want !== 'any' ? [me.id, me.id, me.id, want] : [me.id, me.id, me.id]);
  if (!partner) { // fallback: anyone looking, regardless of the gender choice
    partner = await q1(`SELECT qu.user_id, u.name, u.gender, u.avatar FROM call_queue qu JOIN users u ON u.id = qu.user_id WHERE qu.user_id != ? AND u.suspended = 0 AND NOT EXISTS (SELECT 1 FROM blocks bl WHERE (bl.blocker_id = ? AND bl.blocked_id = qu.user_id) OR (bl.blocker_id = qu.user_id AND bl.blocked_id = ?)) ORDER BY RAND() LIMIT 1`, [me.id, me.id, me.id]);
  }
  if (!partner) {
    await q('INSERT INTO call_queue (user_id, want_gender, kind) VALUES (?, ?, ?)', [me.id, want, kind]);
    return ok({ waiting: true });
  }
  await q('DELETE FROM call_queue WHERE user_id = ?', [partner.user_id]);
  const lkRoom = `call-${me.id}-${partner.user_id}-${Date.now()}`;
  const r = await q("INSERT INTO calls (caller_id, callee_id, livekit_room, kind, status, started_at) VALUES (?, ?, ?, ?, 'active', NOW())", [me.id, partner.user_id, lkRoom, kind]);
  await q("INSERT INTO notifications (user_id, kind, actor_id, title, body) VALUES (?, 'system', ?, 'Incoming call', ?)", [partner.user_id, me.id, `${me.name} is calling you`]);
  const token = await livekitToken(me.id, me.name, lkRoom);
  return ok({ waiting: false, token, url: livekitUrl(), call_id: r.insertId, room_name: lkRoom, partner: { id: partner.user_id, name: partner.name, avatar: partner.avatar } });
}

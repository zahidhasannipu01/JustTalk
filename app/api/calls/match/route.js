import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { currentSubscription } from '@/lib/subscription';
import { hubPush } from '@/lib/hub';
import { notify } from '@/lib/notify';

// Start Calling: random match on the chosen gender — mutual fit only. If
// nobody in the pool fits both ways, the searcher waits in the queue.
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  // "Matches online" counts only people who could actually match me: their
  // gender fits the chip AND their own talk preference includes my gender.
  const myGender = (await q1('SELECT gender FROM users WHERE id = ?', [me.id]))?.gender || '';
  const [row] = await q("SELECT SUM(talk_preference = 'both' OR talk_preference = ?) AS anyone, SUM(gender = 'female' AND (talk_preference = 'both' OR talk_preference = ?)) AS female, SUM(gender = 'male' AND (talk_preference = 'both' OR talk_preference = ?)) AS male FROM users WHERE id != ? AND suspended = 0 AND is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND", [myGender, myGender, myGender, me.id]);
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
    const partnerId = incoming.caller_id === me.id ? incoming.callee_id : incoming.caller_id;
    const partnerU = await q1('SELECT id, name, avatar FROM users WHERE id = ?', [partnerId]);
    if (incoming.status === 'ringing' && incoming.callee_id === me.id) {
      // I pressed Start Calling while someone was already calling me — that counts as accepting.
      await q("UPDATE calls SET status = 'active', started_at = NOW() WHERE id = ?", [incoming.id]);
      hubPush(incoming.caller_id, { t: 'call-accepted', call_id: incoming.id, room_name: incoming.channel });
      return ok({ waiting: false, phase: 'live', call_id: incoming.id, room_name: incoming.channel, partner: partnerU });
    }
    if (incoming.status === 'ringing') return ok({ waiting: false, ringing: true, call_id: incoming.id, room_name: incoming.channel, partner: partnerU });
    return ok({ waiting: false, phase: 'live', call_id: incoming.id, room_name: incoming.channel, partner: partnerU });
  }
  await q('DELETE FROM call_queue WHERE user_id = ?', [me.id]);
  // A match must fit BOTH ways: the gender I picked fits them, AND the
  // gender they picked fits me. If nobody in the pool fits both ways I
  // wait in the queue — an incompatible pair is never forced together.
  const myGender = (await q1('SELECT gender FROM users WHERE id = ?', [me.id]))?.gender || null;
  const partner = await q1(`SELECT qu.user_id, u.name, u.gender, u.avatar FROM call_queue qu JOIN users u ON u.id = qu.user_id WHERE qu.user_id != ? AND u.suspended = 0 AND NOT EXISTS (SELECT 1 FROM blocks bl WHERE (bl.blocker_id = ? AND bl.blocked_id = qu.user_id) OR (bl.blocker_id = qu.user_id AND bl.blocked_id = ?)) AND (? = 'any' OR u.gender = ?) AND (qu.want_gender = 'any' OR ? IS NULL OR qu.want_gender = ?) ORDER BY RAND() LIMIT 1`, [me.id, me.id, me.id, want, want, myGender, myGender]);
  if (!partner) {
    await q('INSERT INTO call_queue (user_id, want_gender, kind) VALUES (?, ?, ?)', [me.id, want, kind]);
    return ok({ waiting: true });
  }
  await q('DELETE FROM call_queue WHERE user_id = ?', [partner.user_id]);
  const channel = `call-${me.id}-${partner.user_id}-${Date.now()}`;
  const r = await q("INSERT INTO calls (caller_id, callee_id, channel, kind, status, source) VALUES (?, ?, ?, ?, 'ringing', 'match')", [me.id, partner.user_id, channel, kind]);
  await notify(partner.user_id, { kind: 'system', actor_id: me.id, title: 'Incoming call', body: `${me.name} is calling you` });
  const meU = await q1('SELECT avatar FROM users WHERE id = ?', [me.id]);
  hubPush(partner.user_id, { t: 'incoming-call', call_id: r.insertId, room_name: channel, kind, from_match: true, partner: { id: me.id, name: me.name, avatar: meU?.avatar || null } });
  return ok({ waiting: false, ringing: true, call_id: r.insertId, room_name: channel, partner: { id: partner.user_id, name: partner.name, avatar: partner.avatar } });
}

// Leaving the search: take me out of the match queue.
export async function DELETE() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  await q('DELETE FROM call_queue WHERE user_id = ?', [me.id]);
  return ok({});
}

import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { currentSubscription } from '@/lib/subscription';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const today = await q1('SELECT minutes, calls FROM user_daily_stats WHERE user_id = ? AND day = CURDATE()', [me.id]);
  const [week] = await q('SELECT COALESCE(SUM(minutes),0) AS m FROM user_daily_stats WHERE user_id = ? AND day >= CURDATE() - INTERVAL 6 DAY', [me.id]);
  const [all] = await q('SELECT COALESCE(SUM(minutes),0) AS m, COALESCE(SUM(calls),0) AS c FROM user_daily_stats WHERE user_id = ?', [me.id]);
  // streak: consecutive days with minutes > 0 ending today/yesterday
  const rows = await q('SELECT day, minutes FROM user_daily_stats WHERE user_id = ? AND minutes > 0 ORDER BY day DESC LIMIT 60', [me.id]);
  let streak = 0; let cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  const dayStr = d => d.toISOString().slice(0, 10);
  const set = new Set(rows.map(r => dayStr(new Date(r.day))));
  if (!set.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayStr(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const rating = await q1('SELECT ROUND(AVG((fluency + speaking + behaviour) / 3), 1) AS rating, COUNT(*) AS n, ROUND(AVG(fluency),1) AS f, ROUND(AVG(speaking),1) AS s, ROUND(AVG(behaviour),1) AS b FROM ratings WHERE ratee_id = ?', [me.id]);

  // Series built from real daily stats, shaped like the preview's PERIODS.
  const statRows = await q('SELECT day, minutes FROM user_daily_stats WHERE user_id = ? AND day >= CURDATE() - INTERVAL 400 DAY ORDER BY day', [me.id]);
  const byDay = new Map(statRows.map(r => [iso(new Date(r.day)), Number(r.minutes)]));
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const weekly = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); weekly.push({ label: i === 0 ? 'Today' : WD[d.getDay()], minutes: byDay.get(iso(d)) || 0, wd: WD[d.getDay()] }); }
  const monthly = [];
  for (let dnum = 1; dnum <= now.getDate(); dnum++) { const d = new Date(now.getFullYear(), now.getMonth(), dnum); monthly.push({ label: String(dnum), minutes: byDay.get(iso(d)) || 0, md: `${MO[d.getMonth()]} ${dnum}` }); }
  const yearly = [];
  for (let m = 0; m <= now.getMonth(); m++) {
    let sum = 0; for (const [k, v] of byDay) { const d = new Date(k + 'T00:00:00'); if (d.getFullYear() === now.getFullYear() && d.getMonth() === m) sum += v; }
    yearly.push({ label: MO[m], minutes: sum });
  }
  const series = { weekly, monthly, yearly };

  // Recent activity for the profile page (real calls, newest first).
  const actRows = await q(`SELECT c.id, c.kind, c.duration_seconds, c.ended_at, c.created_at, u.name AS partner_name, r.title AS room_title FROM calls c LEFT JOIN users u ON u.id = CASE WHEN c.caller_id = ? THEN c.callee_id ELSE c.caller_id END LEFT JOIN rooms r ON r.id = c.room_id WHERE (c.caller_id = ? OR c.callee_id = ?) AND c.status = 'ended' ORDER BY c.id DESC LIMIT 4`, [me.id, me.id, me.id]);
  const activity = actRows.map(c => {
    const mins = Math.max(1, Math.round((c.duration_seconds || 0) / 60));
    const when = new Date(c.ended_at || c.created_at);
    const days = Math.floor((now - new Date(when.getFullYear(), when.getMonth(), when.getDate())) / 86400000);
    const dayLabel = days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
    return c.room_title
      ? { title: `Room practice — ${c.room_title}`, sub: `${mins} minutes in the room · ${dayLabel.toLowerCase()}`, when: dayLabel }
      : { title: `Call with ${c.partner_name || 'a partner'}`, sub: `${mins} minutes · ${c.kind === 'video' ? 'Video' : 'Audio'} call`, when: dayLabel };
  });

  const [live] = await q('SELECT COUNT(*) AS n FROM users WHERE is_online = 1');
  const sub = await currentSubscription(me.id);
  const [roomsJoined] = await q('SELECT COUNT(DISTINCT room_id) AS n FROM calls WHERE caller_id = ? AND room_id IS NOT NULL', [me.id]);
  return ok({ today: today || { minutes: 0, calls: 0 }, week_minutes: Number(week.m), all_minutes: Number(all.m), all_calls: Number(all.c), streak, rating: rating.rating, ratings_count: rating.n, rating_cats: rating.n ? { fluency: Number(rating.f), speaking: Number(rating.s), behaviour: Number(rating.b) } : null, series, activity, rooms_joined: roomsJoined.n, live_now: live.n, plan: sub });
}

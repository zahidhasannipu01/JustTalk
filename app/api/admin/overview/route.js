import { q, q1 } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
// Metrics only — never conversation content.
export async function GET() {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const [users] = await q('SELECT COUNT(*) AS n FROM users');
  const [online] = await q('SELECT COUNT(*) AS n FROM users WHERE is_online = 1');
  const [mins] = await q('SELECT COALESCE(SUM(minutes),0) AS m, COALESCE(SUM(calls),0) AS c FROM user_daily_stats');
  const [today] = await q('SELECT COALESCE(SUM(minutes),0) AS m, COALESCE(SUM(calls),0) AS c FROM user_daily_stats WHERE day = CURDATE()');
  const [yday] = await q('SELECT COALESCE(SUM(minutes),0) AS m FROM user_daily_stats WHERE day = CURDATE() - INTERVAL 1 DAY');
  const avg = mins.c > 0 ? Math.round((mins.m / mins.c) * 10) / 10 : 0;
  const avgToday = today.c > 0 ? Math.round(today.m / today.c) : 0;
  const deltaPct = yday.m > 0 ? Math.round(((today.m - yday.m) / yday.m) * 100) : null;
  const [paid] = await q("SELECT COALESCE(SUM(amount_taka),0) AS t FROM payment_requests WHERE status = 'approved'");
  const [paidMonth] = await q("SELECT COALESCE(SUM(amount_taka),0) AS t FROM payment_requests WHERE status = 'approved' AND decided_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
  const [waiting] = await q("SELECT COUNT(*) AS n FROM payment_requests WHERE status = 'waiting'");
  const log = await q('SELECT * FROM admin_activity_log ORDER BY id DESC LIMIT 20');
  // Week series (platform minutes per day, last 7 days).
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wrows = await q('SELECT day, COALESCE(SUM(minutes),0) AS m FROM user_daily_stats WHERE day >= CURDATE() - INTERVAL 6 DAY GROUP BY day ORDER BY day');
  const wmap = new Map(wrows.map(r => [new Date(r.day).toISOString().slice(0, 10), Number(r.m)]));
  const week = []; let weekTotal = 0;
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); const v = wmap.get(d.toISOString().slice(0, 10)) || 0; weekTotal += v; week.push({ label: i === 0 ? 'Today' : WD[d.getDay()], minutes: v }); }
  // Top talkers today.
  const talkers = await q(`SELECT u.id, u.name, u.avatar, u.note, u.city, u.device, u.is_online, s.minutes, s.calls FROM user_daily_stats s JOIN users u ON u.id = s.user_id WHERE s.day = CURDATE() ORDER BY s.minutes DESC LIMIT 5`);
  // Devices + locations (real aggregates over registered users).
  const devRows = await q("SELECT COALESCE(NULLIF(device,''), 'Unknown') AS device, COUNT(*) AS n FROM users GROUP BY device ORDER BY n DESC LIMIT 5");
  const locRows = await q("SELECT COALESCE(NULLIF(city,''), 'Unknown') AS city, COUNT(*) AS n FROM users GROUP BY city ORDER BY n DESC LIMIT 7");
  const [paidUsers] = await q("SELECT COUNT(DISTINCT s.user_id) AS n FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.price_taka > 0");
  const [overdue] = await q("SELECT COUNT(*) AS n, COALESCE(SUM(p.price_taka),0) AS t FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.price_taka > 0 AND s.expires_at IS NOT NULL AND s.expires_at < NOW()");
  const [due7] = await q("SELECT COUNT(*) AS n, COALESCE(SUM(p.price_taka),0) AS t FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.price_taka > 0 AND s.expires_at IS NOT NULL AND s.expires_at >= NOW() AND s.expires_at < NOW() + INTERVAL 7 DAY");
  // Sidebar badge counts.
  const [pkgCount] = await q('SELECT COUNT(*) AS n FROM packages');
  const [repOpen] = await q("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");
  const [tktOpen] = await q("SELECT COUNT(*) AS n FROM support_tickets WHERE status != 'resolved'");
  return ok({
    users: users.n, online: online.n, total_minutes: Number(mins.m), total_calls: Number(mins.c), avg_minutes_per_call: avg,
    today_minutes: Number(today.m), today_calls: Number(today.c), avg_call_today: avgToday, delta_pct: deltaPct,
    paid_total_taka: Number(paid.t), paid_month_taka: Number(paidMonth.t), waiting_payments: waiting.n, activity_log: log,
    week_series: week, week_total: weekTotal, top_talkers: talkers,
    devices: devRows.map(r => ({ label: r.device, n: Number(r.n) })), locations: locRows.map(r => ({ label: r.city, n: Number(r.n) })),
    paid_users: paidUsers.n, overdue: { n: overdue.n, taka: Number(overdue.t) }, due7: { n: due7.n, taka: Number(due7.t) },
    counts: { users: users.n, packages: pkgCount.n, payments_due: waiting.n, reports: repOpen.n, tickets: tktOpen.n },
  });
}

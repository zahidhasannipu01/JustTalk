import { q } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

// Activity log + whole-platform feed, built from real events (metrics only, never content).
export async function GET() {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const log = await q('SELECT * FROM admin_activity_log ORDER BY id DESC LIMIT 30');
  // Platform feed: real user events from calls / rooms / subscriptions / registrations.
  const feed = await q(`
    SELECT * FROM (
      (SELECT CONCAT(u.name, ' finished a call') AS text, CONCAT(ROUND(c.duration_seconds / 60), ' minutes · ', c.kind, ' call') AS sub, c.ended_at AS at FROM calls c JOIN users u ON u.id = c.caller_id WHERE c.status = 'ended' AND c.ended_at IS NOT NULL ORDER BY c.id DESC LIMIT 8)
      UNION ALL
      (SELECT CONCAT(u.name, ' created the room “', r.title, '”') AS text, '' AS sub, r.created_at AS at FROM rooms r JOIN users u ON u.id = r.creator_id ORDER BY r.id DESC LIMIT 8)
      UNION ALL
      (SELECT CONCAT(u.name, ' is on the ', p.name, ' plan') AS text, 'Subscription' AS sub, s.started_at AS at FROM subscriptions s JOIN users u ON u.id = s.user_id JOIN packages p ON p.id = s.package_id WHERE p.price_taka > 0 ORDER BY s.id DESC LIMIT 8)
      UNION ALL
      (SELECT CONCAT(u.name, ' created an account') AS text, 'Free plan' AS sub, u.created_at AS at FROM users u ORDER BY u.id DESC LIMIT 8)
    ) x ORDER BY x.at DESC LIMIT 12`);
  const [subsToday] = await q("SELECT COUNT(*) AS n FROM subscriptions WHERE DATE(started_at) = CURDATE()");
  const [aiOptins] = await q('SELECT COUNT(*) AS n FROM users WHERE ai_reports_optin = 1');
  const [repToday] = await q('SELECT COUNT(*) AS n, COALESCE(SUM(ai_minutes),0) AS m FROM ai_reports WHERE report_date = CURDATE()');
  const usage = await q('SELECT u.name, SUM(r.ai_minutes) AS minutes FROM ai_reports r JOIN users u ON u.id = r.user_id WHERE r.report_date = CURDATE() GROUP BY r.user_id ORDER BY minutes DESC LIMIT 6');
  const [softRow] = await q('SELECT soft_daily_ai_minutes AS lim FROM ai_settings ORDER BY id LIMIT 1');
  const softLimit = softRow?.lim || 30;
  const atLimit = usage.filter(u => Number(u.minutes) >= softLimit).length;
  return ok({ log, feed, subs_today: subsToday.n, ai_optins: aiOptins.n, reports_today: repToday.n, ai_minutes_today: Number(repToday.m), ai_usage: usage.map(u => ({ name: u.name, minutes: Number(u.minutes) })), soft_limit: softLimit, at_limit: atLimit });
}

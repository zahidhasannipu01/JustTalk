import { q, q1 } from './db';

const SUB_SQL = `SELECT s.*, p.name AS plan_name, p.price_taka, p.daily_call_minutes, p.ai_reports, p.ai_report_frequency FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.id DESC LIMIT 1`;

// The user's current subscription, with FUNCTIONALITY §46 applied: a paid plan
// whose period has ended unrenewed switches to Free automatically (the expired
// row stays in history, so the expired-from plan is remembered).
export async function currentSubscription(userId) {
  let sub = await q1(SUB_SQL, [userId]);
  if (sub && Number(sub.price_taka) > 0 && sub.expires_at && new Date(sub.expires_at).getTime() < Date.now()) {
    await q("UPDATE subscriptions SET status = 'expired' WHERE id = ?", [sub.id]);
    const free = await q1('SELECT id FROM packages WHERE price_taka = 0 AND is_active = 1 ORDER BY sort_order, id LIMIT 1');
    if (free) {
      await q("INSERT INTO subscriptions (user_id, package_id, status, started_at, expires_at) VALUES (?, ?, 'active', NOW(), NULL)", [userId, free.id]);
      sub = await q1(SUB_SQL, [userId]);
    }
  }
  return sub;
}

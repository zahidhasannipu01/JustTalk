import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

// Switch the signed-in user back to the Free plan: expire whatever is active,
// activate Free, and clear any unread payment reminders (they no longer apply).
export async function POST() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const free = await q1('SELECT id FROM packages WHERE price_taka = 0 AND is_active = 1 ORDER BY sort_order, id LIMIT 1');
  if (!free) return fail('Free plan not found', 500);
  await q("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", [me.id]);
  await q("INSERT INTO subscriptions (user_id, package_id, status, started_at, expires_at) VALUES (?, ?, 'active', NOW(), NULL)", [me.id, free.id]);
  await q("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND kind = 'subscription_reminder' AND is_read = 0", [me.id]);
  return ok();
}

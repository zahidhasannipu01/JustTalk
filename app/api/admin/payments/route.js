import { q, q1 } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logAdmin } from '@/lib/admin';
import { notify } from '@/lib/notify';
export async function GET() {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const rows = await q(`SELECT pr.*, u.name AS user_name, u.avatar, u.city AS user_city, p.name AS package_name FROM payment_requests pr JOIN users u ON u.id = pr.user_id JOIN packages p ON p.id = pr.package_id ORDER BY pr.id DESC LIMIT 100`);
  const [totals] = await q("SELECT COALESCE(SUM(CASE WHEN status='approved' THEN amount_taka ELSE 0 END),0) AS approved, COUNT(CASE WHEN status='waiting' THEN 1 END) AS waiting FROM payment_requests");
  const waiting = rows.filter(r => r.status === 'waiting');
  const paid = rows.filter(r => r.status === 'approved');
  const [month] = await q("SELECT COALESCE(SUM(amount_taka),0) AS t, COUNT(*) AS n FROM payment_requests WHERE status = 'approved' AND decided_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')");
  const [today] = await q("SELECT COALESCE(SUM(amount_taka),0) AS t, COUNT(*) AS n FROM payment_requests WHERE status = 'approved' AND DATE(decided_at) = CURDATE()");
  const [expected] = await q("SELECT COALESCE(SUM(p.price_taka),0) AS t FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.price_taka > 0");
  const [paidUsers] = await q("SELECT COUNT(DISTINCT s.user_id) AS n FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.price_taka > 0");
  const byPlan = await q("SELECT p.name, p.price_taka, COUNT(DISTINCT s.user_id) AS subs FROM packages p LEFT JOIN subscriptions s ON s.package_id = p.id AND s.status = 'active' GROUP BY p.id ORDER BY p.sort_order");
  const methods = await q("SELECT method, COALESCE(SUM(amount_taka),0) AS t FROM payment_requests WHERE status = 'approved' AND decided_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') GROUP BY method");
  // Who is going to pay: paid-plan subscriptions expiring within 7 days, or already past due.
  const due = await q(`SELECT s.id, s.expires_at, u.id AS user_id, u.name AS user_name, u.avatar, u.city, p.name AS package_name, p.price_taka,
    (SELECT pr2.method FROM payment_requests pr2 WHERE pr2.user_id = u.id AND pr2.status = 'approved' ORDER BY pr2.id DESC LIMIT 1) AS last_method
    FROM subscriptions s JOIN users u ON u.id = s.user_id JOIN packages p ON p.id = s.package_id
    WHERE s.status = 'active' AND p.price_taka > 0 AND s.expires_at IS NOT NULL AND s.expires_at < NOW() + INTERVAL 7 DAY ORDER BY s.expires_at ASC LIMIT 50`);
  const [rejected] = await q("SELECT COUNT(*) AS n FROM payment_requests WHERE status = 'rejected'");
  return ok({ payments: rows, waiting, paid, due, totals, rejected_count: rejected.n, stats: { month_taka: Number(month.t), month_count: month.n, today_taka: Number(today.t), today_count: today.n, expected_taka: Number(expected.t), paid_users: paidUsers.n, by_plan: byPlan, methods } });
}
export async function POST(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null);
  if (b?.action === 'remind') {
    const uid = Number(b.user_id); if (!uid) return fail('Invalid user');
    // A reminder only makes sense for someone who has actually held a paid
    // plan (active or expired). Never-subscribed users get a clear error.
    const rec = await q1(`SELECT s.id FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = ? AND p.price_taka > 0 AND s.status IN ('active', 'expired') LIMIT 1`, [uid]);
    if (!rec) return fail('This user has never had a paid plan — nothing to remind about');
    const s = await q1(`SELECT p.name AS plan_name, p.price_taka, s.expires_at FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.id DESC LIMIT 1`, [uid]);
    let body = 'Your plan needs renewing — see Subscription';
    if (s) {
      const exp = s.expires_at ? new Date(s.expires_at) : null;
      const days = exp ? Math.round((new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000) : null;
      const when = days === null ? 'soon' : days < -1 ? `${-days} days ago` : days === -1 ? 'yesterday' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
      body = `${s.plan_name} renewal ৳${s.price_taka} ${days !== null && days < 0 ? 'was due' : 'is due'} ${when}`;
    }
    await notify(uid, { kind: 'subscription_reminder', title: 'Payment reminder', body });
    await logAdmin(a.id, 'reminder_sent', `user ${uid}`); return ok();
  }
  const pr = await q1('SELECT * FROM payment_requests WHERE id = ?', [Number(b?.payment_id)]);
  if (!pr) return fail('Payment not found', 404);
  if (b?.action === 'approve') {
    await q("UPDATE payment_requests SET status = 'approved', decided_at = NOW() WHERE id = ?", [pr.id]);
    await q("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", [pr.user_id]);
    await q("INSERT INTO subscriptions (user_id, package_id, status, started_at, expires_at) VALUES (?, ?, 'active', NOW(), NOW() + INTERVAL 30 DAY)", [pr.user_id, pr.package_id]);
    // The payment is approved, so every earlier reminder is stale history —
    // delete them outright (not just mark read) or the bell tray keeps
    // showing a "was due" row to a user who has already paid.
    await q("DELETE FROM notifications WHERE user_id = ? AND kind = 'subscription_reminder'", [pr.user_id]);
    await notify(pr.user_id, { kind: 'payment', title: 'Payment confirmed', body: 'Your plan is active' });
    await logAdmin(a.id, 'payment_approved', `#${pr.id} ${pr.amount_taka} taka`);
  } else if (b?.action === 'reject') {
    await q("UPDATE payment_requests SET status = 'rejected', decided_at = NOW() WHERE id = ?", [pr.id]);
    await logAdmin(a.id, 'payment_rejected', `#${pr.id}`);
  } else return fail('Unknown action');
  return ok();
}

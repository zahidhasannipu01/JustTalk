import { q, q1 } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logAdmin } from '@/lib/admin';
const PAGE = 5;
export async function GET(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const sp = new URL(req.url).searchParams; const page = Math.max(1, Number(sp.get('page') || 1)); const search = sp.get('search') || ''; const filter = sp.get('filter') || 'all';
  const conds = []; const args = [];
  if (search) { conds.push('(u.name LIKE ? OR u.email LIKE ?)'); args.push(`%${search}%`, `%${search}%`); }
  if (filter === 'online') conds.push('u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND');
  if (filter === 'paid') conds.push("EXISTS (SELECT 1 FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = u.id AND s.status = 'active' AND p.price_taka > 0)");
  if (filter === 'free') conds.push("NOT EXISTS (SELECT 1 FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = u.id AND s.status = 'active' AND p.price_taka > 0)");
  if (filter === 'ai') conds.push('u.ai_reports_optin = 1');
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const [cnt] = await q(`SELECT COUNT(*) AS n FROM users u ${where}`, args);
  const rows = await q(`SELECT u.id, u.name, u.email, u.username, u.note, u.avatar, u.city, u.country, u.device, u.last_ip, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS is_online, u.last_seen_at, u.suspended, u.ai_reports_optin, u.created_at, (SELECT COALESCE(SUM(minutes),0) FROM user_daily_stats s WHERE s.user_id = u.id) AS minutes, (SELECT COALESCE(SUM(calls),0) FROM user_daily_stats s WHERE s.user_id = u.id) AS calls, (SELECT COALESCE(minutes,0) FROM user_daily_stats s WHERE s.user_id = u.id AND s.day = CURDATE()) AS today_minutes, (SELECT p.name FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.user_id = u.id AND s.status = 'active' ORDER BY s.id DESC LIMIT 1) AS plan FROM users u ${where} ORDER BY u.id DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`, args);
  return ok({ users: rows, total: cnt.n, page, pages: Math.max(1, Math.ceil(cnt.n / PAGE)) });
}
export async function PATCH(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null); const uid = Number(b?.user_id); if (!uid) return fail('Invalid user');
  if (b.suspended !== undefined) { await q('UPDATE users SET suspended = ? WHERE id = ?', [b.suspended ? 1 : 0, uid]); await logAdmin(a.id, b.suspended ? 'user_suspended' : 'user_unsuspended', `user ${uid}`); }
  if (b.package_id) {
    const pkg = await q1('SELECT * FROM packages WHERE id = ?', [Number(b.package_id)]); if (!pkg) return fail('Package not found', 404);
    await q("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", [uid]);
    await q("INSERT INTO subscriptions (user_id, package_id, status, expires_at) VALUES (?, ?, 'active', CASE WHEN ? = 0 THEN NULL ELSE NOW() + INTERVAL 30 DAY END)", [uid, pkg.id, pkg.price_taka]);
    await q("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND kind = 'subscription_reminder' AND is_read = 0", [uid]);
    await logAdmin(a.id, 'plan_changed', `user ${uid} -> ${pkg.name}`);
  }
  return ok();
}

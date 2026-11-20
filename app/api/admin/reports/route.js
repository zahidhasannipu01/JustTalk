import { q } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logAdmin } from '@/lib/admin';
const PAGE = 5;
export async function GET(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page') || 1));
  const [cnt] = await q('SELECT COUNT(*) AS n FROM reports');
  const rows = await q(`SELECT r.*, u1.name AS reporter_name, u1.avatar AS reporter_avatar, u2.name AS reported_name, u2.avatar AS reported_avatar, u2.suspended AS reported_suspended, (SELECT COUNT(*) FROM reports r2 WHERE r2.reported_id = r.reported_id) AS reports_against FROM reports r JOIN users u1 ON u1.id = r.reporter_id JOIN users u2 ON u2.id = r.reported_id ORDER BY r.id DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`);
  const [open] = await q("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");
  const [distinct] = await q('SELECT COUNT(DISTINCT reported_id) AS n FROM reports');
  const [blocked] = await q('SELECT COUNT(*) AS n FROM users WHERE suspended = 1');
  const [reviewedToday] = await q("SELECT COUNT(*) AS n FROM reports WHERE status != 'open'");
  return ok({ reports: rows, total: cnt.n, page, pages: Math.max(1, Math.ceil(cnt.n / PAGE)), counts: { open: open.n, distinct_reported: distinct.n, blocked: blocked.n, reviewed: reviewedToday.n } });
}
export async function PATCH(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null); const id = Number(b?.report_id); if (!id) return fail('Invalid report');
  if (b.admin_note !== undefined) await q('UPDATE reports SET admin_note = ? WHERE id = ?', [b.admin_note, id]);
  if (b.status) await q('UPDATE reports SET status = ? WHERE id = ?', [b.status, id]);
  if (b.block_user) { const r = await q('SELECT reported_id FROM reports WHERE id = ?', [id]); if (r[0]) { await q('UPDATE users SET suspended = 1 WHERE id = ?', [r[0].reported_id]); await q("UPDATE reports SET status = 'actioned' WHERE id = ?", [id]); await logAdmin(a.id, 'user_blocked_from_report', `report ${id}`); } }
  return ok();
}

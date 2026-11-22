import { q } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { notify } from '@/lib/notify';
const PAGE = 5;
export async function GET(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page') || 1));
  const [cnt] = await q('SELECT COUNT(*) AS n FROM support_tickets');
  const rows = await q(`SELECT t.*, u.name AS user_name, u.avatar FROM support_tickets t JOIN users u ON u.id = t.user_id ORDER BY t.id DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`);
  const [open] = await q("SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'");
  const [noted] = await q('SELECT COUNT(*) AS n FROM support_tickets WHERE admin_note IS NOT NULL');
  const [resolved] = await q("SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'resolved'");
  return ok({ tickets: rows, total: cnt.n, page, pages: Math.max(1, Math.ceil(cnt.n / PAGE)), counts: { open: open.n, total: cnt.n, noted: noted.n, resolved: resolved.n } });
}
export async function PATCH(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null); const id = Number(b?.ticket_id); if (!id) return fail('Invalid ticket');
  if (b.admin_note !== undefined) { await q("UPDATE support_tickets SET admin_note = ?, status = 'answered' WHERE id = ?", [b.admin_note, id]); const t = await q('SELECT user_id FROM support_tickets WHERE id = ?', [id]); if (t[0]) await notify(t[0].user_id, { kind: 'message', title: 'Support replied', body: 'Support answered your ticket' }); }
  if (b.status) await q('UPDATE support_tickets SET status = ? WHERE id = ?', [b.status, id]);
  return ok();
}

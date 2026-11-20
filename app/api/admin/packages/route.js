import { q, q1 } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logAdmin } from '@/lib/admin';
export async function GET() { const a = await currentAdmin(); if (!a) return fail('Admin only', 401); return ok({ packages: await q('SELECT * FROM packages ORDER BY sort_order, id') }); }
export async function POST(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null); if (!b?.name) return fail('Package name is required');
  const freq = ['none', 'weekly', 'daily'].includes(b.ai_report_frequency) ? b.ai_report_frequency : (b.ai_reports ? 'daily' : 'none');
  const period = ['month', 'year', 'once', 'free'].includes(b.period) ? b.period : 'month';
  const active = b.is_active === undefined ? 1 : (b.is_active ? 1 : 0);
  const vals = [b.name, Number(b.price_taka) || 0, period, b.daily_call_minutes === '' || b.daily_call_minutes == null ? null : Number(b.daily_call_minutes), freq !== 'none' ? 1 : 0, freq, b.tag || null, b.description || null, b.included || null, b.not_included || null, active, Number(b.sort_order) || 0];
  if (b.id) { await q('UPDATE packages SET name=?, price_taka=?, period=?, daily_call_minutes=?, ai_reports=?, ai_report_frequency=?, tag=?, description=?, included=?, not_included=?, is_active=?, sort_order=? WHERE id=?', [...vals, Number(b.id)]); await logAdmin(a.id, 'package_updated', b.name); return ok({ id: Number(b.id) }); }
  const r = await q('INSERT INTO packages (name, price_taka, period, daily_call_minutes, ai_reports, ai_report_frequency, tag, description, included, not_included, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', vals);
  await logAdmin(a.id, 'package_created', b.name); return ok({ id: r.insertId });
}
export async function DELETE(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const id = Number(new URL(req.url).searchParams.get('id')); if (!id) return fail('Invalid package');
  const used = await q1('SELECT 1 AS x FROM subscriptions WHERE package_id = ? LIMIT 1', [id]);
  if (used) { await q('UPDATE packages SET is_active = 0 WHERE id = ?', [id]); return ok({ deactivated: true }); }
  await q('DELETE FROM packages WHERE id = ?', [id]); return ok();
}

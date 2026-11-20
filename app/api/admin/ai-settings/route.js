import { q, q1 } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { logAdmin } from '@/lib/admin';
export async function GET() {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const s = await q1('SELECT * FROM ai_settings ORDER BY id LIMIT 1');
  const [premium] = await q("SELECT COUNT(DISTINCT s.user_id) AS n FROM subscriptions s JOIN packages p ON p.id = s.package_id WHERE s.status = 'active' AND p.ai_reports = 1");
  return ok({ settings: s, premium_users: premium.n });
}
export async function POST(req) {
  const a = await currentAdmin(); if (!a) return fail('Admin only', 401);
  const b = await req.json().catch(() => null); if (!b) return fail('Invalid request');
  const s = await q1('SELECT id FROM ai_settings ORDER BY id LIMIT 1');
  const vals = [b.provider || 'DeepSeek', b.base_url || 'https://api.deepseek.com', b.api_key_masked || null, b.stt_model || null, b.analysis_model || null, Number(b.credit_balance_usd) || 0, Number(b.soft_daily_ai_minutes) || 30];
  if (s) await q('UPDATE ai_settings SET provider=?, base_url=?, api_key_masked=?, stt_model=?, analysis_model=?, credit_balance_usd=?, soft_daily_ai_minutes=? WHERE id=?', [...vals, s.id]);
  else await q('INSERT INTO ai_settings (provider, base_url, api_key_masked, stt_model, analysis_model, credit_balance_usd, soft_daily_ai_minutes) VALUES (?,?,?,?,?,?,?)', vals);
  await logAdmin(a.id, 'ai_settings_updated', b.provider || 'DeepSeek');
  return ok();
}

import { q } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function GET() { const a = await currentAdmin(); if (!a) return fail('Admin only', 401); const rows = await q('SELECT k, v FROM app_settings'); return ok({ settings: Object.fromEntries(rows.map(r => [r.k, r.v])) }); }
const KEYS = ['pay_bkash_number', 'pay_nagad_number',
  'ctl_registrations', 'ctl_matching', 'ctl_rooms', 'ctl_ratings', 'ctl_blocking', 'ctl_nudge', 'ctl_video', 'ctl_maintenance',
  'lim_free_minutes', 'lim_max_call', 'lim_room_size', 'announcement_text',
  'ai_soft_limit_on', 'ai_soft_warn', 'ai_soft_behaviour', 'ai_reports_on', 'ai_daily_one', 'ai_first_call_ask', 'ai_profile_optout', 'ai_own_voice',
  'ai_report_includes', 'ai_report_time', 'ai_alert_at', 'ai_language', 'ai_temperature', 'ai_used_usd'];
export async function POST(req) { const a = await currentAdmin(); if (!a) return fail('Admin only', 401); const b = await req.json().catch(() => null); if (!b) return fail('Invalid request'); for (const k of KEYS) if (b[k] !== undefined) await q('INSERT INTO app_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, String(b[k])]); return ok(); }

import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { aiEligibility, maybeGenerateReport, periodSpeech, publicReport } from '@/lib/aireport';

// The AI report page's data: eligibility, the latest scored report
// (generating one first when the period has enough uncovered speech),
// and the history list. ?id= opens a specific past report instead.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const elig = await aiEligibility(me.id);
  if (!elig.eligible) return ok({ eligible: false, plan_name: elig.plan_name });
  if (!elig.optin) return ok({ eligible: true, optin: false, frequency: elig.frequency, plan_name: elig.plan_name, report: null, history: [] });
  await maybeGenerateReport(me.id).catch(() => {});
  const wantId = Number(new URL(req.url).searchParams.get('id')) || null;
  const latest = await q1('SELECT * FROM ai_reports WHERE user_id = ? ORDER BY report_date DESC, id DESC LIMIT 1', [me.id]);
  const chosen = wantId ? await q1('SELECT * FROM ai_reports WHERE user_id = ? AND id = ?', [me.id, wantId]) : latest;
  const hist = await q('SELECT id, report_date, overall, ai_minutes, period FROM ai_reports WHERE user_id = ? ORDER BY report_date DESC, id DESC LIMIT 12', [me.id]);
  const speech = await periodSpeech(me.id, elig.frequency);
  return ok({
    eligible: true,
    optin: true,
    frequency: elig.frequency,
    plan_name: elig.plan_name,
    report: publicReport(chosen || null),
    history: hist.map(h => ({ id: h.id, report_date: h.report_date, overall: h.overall, ai_minutes: h.ai_minutes, period: h.period })),
    speech_seconds: speech.seconds,
  });
}

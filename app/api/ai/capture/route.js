import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { currentSubscription } from '@/lib/subscription';

// Speech-capture chunks from the user's own browser during their calls
// (see lib/speech.js). Stored per day; the report generator reads them.
// Only accepted when the user's plan includes AI reports AND they have
// opted in — anything else is dropped here, never stored.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const u = await q1('SELECT ai_reports_optin FROM users WHERE id = ?', [me.id]);
  if (!u?.ai_reports_optin) return ok({ stored: false });
  const sub = await currentSubscription(me.id);
  if (!sub?.ai_reports || sub.ai_report_frequency === 'none') return ok({ stored: false });
  const b = await req.json().catch(() => null);
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, 20000) : '';
  if (!text) return ok({ stored: false });
  const words = Math.min(10000, Math.max(0, Number(b?.words) || 0));
  const seconds = Math.min(3600, Math.max(0, Number(b?.seconds) || 0));
  const confidence = b?.confidence != null && Number.isFinite(Number(b.confidence)) ? Math.max(0, Math.min(1, Number(b.confidence))) : null;
  const callId = Number(b?.call_id) || null;
  await q('INSERT INTO speech_logs (user_id, call_id, day, text, words, seconds, confidence) VALUES (?, ?, CURDATE(), ?, ?, ?, ?)', [me.id, callId, text, words, seconds, confidence]);
  return ok({ stored: true });
}

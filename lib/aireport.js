import { q, q1 } from './db';
import { currentSubscription } from './subscription';

// AI speaking reports (IELTS-style, 4 criteria × 25%).
//
// Pipeline: the user's own browser transcribed their own voice during
// calls into speech_logs (lib/speech.js + /api/ai/capture). When the user
// opens the AI report page, maybeGenerateReport() checks whether the
// current period (Pro: today, Plus: this week) holds at least ~2 minutes
// of speech that no report covers yet; if so it sends the period's
// transcript to DeepSeek with the fixed rubric below and stores the
// scored report. Generation is a no-op without a usable API key in
// ai_settings (entered by the owner in Super Admin → AI & API settings).

const RUBRIC = `You are an IELTS speaking examiner. Assess the speaker ONLY from the transcript of their own speech below (plus the speech-recognition clarity stats). Score each of the four criteria from 0 to 100. The criteria and what they measure:

1. Fluency and Coherence (25%): how smoothly and logically they communicate ideas. Fluent speech without unnecessary pauses; natural flow; ideas organised logically; sentences and ideas connected effectively; little hesitation and repetition.
2. Lexical Resource (25%): vocabulary range and accuracy. Wide range of vocabulary; appropriate words for different contexts; idiomatic expressions and collocations used naturally; effective paraphrasing; little unnecessary repetition of words.
3. Grammatical Range and Accuracy (25%): variety and accuracy of grammar. Both simple and complex sentences; correct tense usage; subject-verb agreement; articles and prepositions used accurately; few grammatical errors; a variety of sentence structures.
4. Pronunciation (25%): how clearly and naturally words are pronounced — word stress, sentence stress, intonation, connected speech, clarity and intelligibility. You cannot hear the audio: base this score mainly on the recognition-clarity stats provided (average recognition confidence and how much speech was recognised cleanly) and say in the note that it is an estimate.

Reply with ONLY a JSON object, no markdown, in exactly this shape:
{"overall": <0-100 int>, "summary": "<2 sentences, encouraging, naming the weakest area>", "fluency": {"score": <int>, "note": "<2 sentences on what they did well and what held them back>", "improve": ["<short practical tip>", "<short practical tip>"]}, "lexical": {"score": <int>, "note": "...", "improve": ["...", "..."]}, "grammar": {"score": <int>, "note": "...", "improve": ["...", "..."]}, "pronunciation": {"score": <int>, "note": "...", "improve": ["...", "..."]}}
Quote tiny examples from the transcript inside notes where useful. Be honest but kind. English only.`;

export async function aiEligibility(userId) {
  const sub = await currentSubscription(userId);
  const u = await q1('SELECT ai_reports_optin FROM users WHERE id = ?', [userId]);
  return {
    eligible: !!(sub?.ai_reports && sub.ai_report_frequency && sub.ai_report_frequency !== 'none'),
    frequency: sub?.ai_report_frequency || 'none',
    plan_name: sub?.plan_name || null,
    optin: !!u?.ai_reports_optin,
  };
}

// Speech totals for the current period (daily = today, weekly = Mon–today).
export async function periodSpeech(userId, frequency) {
  const where = frequency === 'weekly'
    ? 'day >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)'
    : 'day = CURDATE()';
  const rows = await q(`SELECT id, text, seconds, confidence FROM speech_logs WHERE user_id = ? AND ${where} ORDER BY id`, [userId]);
  const seconds = rows.reduce((a, r) => a + (r.seconds || 0), 0);
  const confs = rows.filter(r => r.confidence != null);
  const avgConfidence = confs.length ? confs.reduce((a, r) => a + Number(r.confidence), 0) / confs.length : null;
  return { rows, seconds, avgConfidence, lastId: rows.length ? rows[rows.length - 1].id : 0 };
}

function clampScore(v) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0; }
function cleanMetric(m) {
  return {
    score: clampScore(m?.score),
    note: typeof m?.note === 'string' ? m.note.slice(0, 600) : '',
    improve: Array.isArray(m?.improve) ? m.improve.filter(x => typeof x === 'string').slice(0, 3).map(x => x.slice(0, 220)) : [],
  };
}

export async function maybeGenerateReport(userId) {
  const elig = await aiEligibility(userId);
  if (!elig.eligible || !elig.optin) return null;
  const { rows, seconds, avgConfidence, lastId } = await periodSpeech(userId, elig.frequency);
  if (seconds < 120 || !rows.length) return null; // not enough speech yet
  const existing = await q1('SELECT * FROM ai_reports WHERE user_id = ? AND report_date = CURDATE()', [userId]);
  if (existing && Number(existing.covered_until) >= Number(lastId)) return existing; // already covers all speech
  if (existing && seconds - 0 >= 0) {
    // Regenerate only when a meaningful amount of NEW speech arrived.
    const covered = await q1('SELECT COALESCE(SUM(seconds),0) AS s FROM speech_logs WHERE user_id = ? AND id <= ?', [userId, Number(existing.covered_until)]);
    if (seconds - Number(covered?.s || 0) < 45) return existing;
  }

  const settings = await q1('SELECT * FROM ai_settings ORDER BY id LIMIT 1');
  const apiKey = settings?.api_key_masked || '';
  if (!apiKey || apiKey.includes('•') || apiKey.length < 10) return null; // owner has not entered a real key yet
  const baseUrl = (settings?.base_url || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = settings?.analysis_model || 'deepseek-chat';

  const transcript = rows.map(r => r.text).join(' ').slice(-14000);
  const statsLine = `Speaking time analysed: ${Math.round(seconds / 60)} minutes. Average speech-recognition confidence: ${avgConfidence != null ? avgConfidence.toFixed(2) : 'unknown'}.`;
  let parsed;
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
          { role: 'system', content: RUBRIC },
          { role: 'user', content: `${statsLine}\n\nTranscript of the speaker's own speech:\n${transcript}` },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
  } catch { return null; }

  const scores = {
    fluency: cleanMetric(parsed?.fluency),
    lexical: cleanMetric(parsed?.lexical),
    grammar: cleanMetric(parsed?.grammar),
    pronunciation: cleanMetric(parsed?.pronunciation),
  };
  const overall = clampScore(parsed?.overall || (scores.fluency.score + scores.lexical.score + scores.grammar.score + scores.pronunciation.score) / 4);
  const summary = typeof parsed?.summary === 'string' ? parsed.summary.slice(0, 400) : '';
  const aiMinutes = Math.max(1, Math.round(seconds / 60));
  const scoresJson = JSON.stringify(scores);
  const improvements = [...scores.fluency.improve, ...scores.lexical.improve, ...scores.grammar.improve, ...scores.pronunciation.improve].join('\n');
  await q(`INSERT INTO ai_reports (user_id, report_date, fluency, proficiency, grammar, lexical, improvements, ai_minutes, overall, summary, scores, period, covered_until)
    VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE fluency = VALUES(fluency), proficiency = VALUES(proficiency), grammar = VALUES(grammar), lexical = VALUES(lexical), improvements = VALUES(improvements), ai_minutes = VALUES(ai_minutes), overall = VALUES(overall), summary = VALUES(summary), scores = VALUES(scores), period = VALUES(period), covered_until = VALUES(covered_until)`,
    [userId, scores.fluency.note, scores.pronunciation.note, scores.grammar.note, scores.lexical.note, improvements, aiMinutes, overall, summary, scoresJson, elig.frequency, lastId]);
  return await q1('SELECT * FROM ai_reports WHERE user_id = ? AND report_date = CURDATE()', [userId]);
}

export function publicReport(row) {
  if (!row) return null;
  let scores = null;
  try { scores = row.scores ? JSON.parse(row.scores) : null; } catch {}
  return {
    id: row.id,
    report_date: row.report_date,
    overall: row.overall,
    summary: row.summary || '',
    scores,
    ai_minutes: row.ai_minutes,
    period: row.period,
  };
}

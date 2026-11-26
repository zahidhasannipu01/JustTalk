import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { chapterMeta, chapterRules, TOTAL_CHAPTERS } from '@/lib/learning';

const BATCH = 10;

// One chapter: its rules (trilingual, rendered client-side by the language
// toggle), the user's state and which batch to continue with.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const n = Number(new URL(req.url).searchParams.get('n'));
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_CHAPTERS) return fail('Bad chapter', 400);
  const meta = chapterMeta(n);
  const p = await q1('SELECT rules_done, best_score, last_score, answered FROM learning_progress WHERE user_id = ? AND chapter = ?', [me.id, n]);
  const batches = Math.max(1, Math.ceil(meta.questions / BATCH));
  const nextBatch = Math.min(Math.floor(Number(p?.answered || 0) / BATCH), batches - 1);
  const mrows = await q('SELECT qidx FROM learning_mistakes WHERE user_id = ? AND chapter = ? ORDER BY qidx', [me.id, n]);
  return ok({
    n, title: meta.title, rules: chapterRules(n), practiceTotal: meta.questions,
    rulesDone: !!(p && p.rules_done),
    answered: Number(p?.answered || 0),
    best: p && p.best_score != null ? Number(p.best_score) : null,
    last: p && p.last_score != null ? Number(p.last_score) : null,
    nextBatch, batches, mistakeQidx: mrows.map(r => Number(r.qidx)),
  });
}

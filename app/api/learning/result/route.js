import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { TOTAL_CHAPTERS } from '@/lib/learning';

const validCh = c => Number.isInteger(c) && c >= 1 && c <= TOTAL_CHAPTERS;

// Normalise a wrong/fixed list into [{chapter, qidx}]. Chapter rounds send
// bare qidx numbers (their chapter is the round's chapter); review rounds
// send {chapter, qidx} objects because each question has its own chapter.
function normItems(list, chapter) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const it of list) {
    if (typeof it === 'number' && chapter != null && Number.isInteger(it) && it >= 0) out.push({ chapter, qidx: it });
    else if (it && typeof it === 'object' && validCh(Number(it.chapter)) && Number.isInteger(Number(it.qidx)) && Number(it.qidx) >= 0) out.push({ chapter: Number(it.chapter), qidx: Number(it.qidx) });
  }
  return out;
}

// Records one finished round (a chapter batch, or a mistakes review).
// Chapter rounds update that chapter's best/last score; every round adds
// its answers to today's activity, stores new mistakes and clears fixed
// ones. Review rounds also credit each answered question to its chapter's
// answered count.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  const chapter = body.chapter == null ? null : Number(body.chapter);
  if (chapter != null && !validCh(chapter)) return fail('Bad chapter', 400);
  const total = Number(body.total);
  const correct = Number(body.correct);
  if (!Number.isInteger(total) || total < 0 || total > 1000 || !Number.isInteger(correct) || correct < 0 || correct > total) return fail('Bad result', 400);
  const wrong = normItems(body.wrong, chapter);
  const fixed = normItems(body.fixed, chapter);
  if (total === 0 && wrong.length === 0 && fixed.length === 0) return ok({});

  if (chapter != null) {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    await q(`INSERT INTO learning_progress (user_id, chapter, best_score, last_score, answered) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE best_score = GREATEST(COALESCE(best_score, 0), VALUES(best_score)), last_score = VALUES(last_score), answered = answered + VALUES(answered)`,
      [me.id, chapter, pct, pct, total]);
  } else {
    // Review round: one answered credit per item, grouped by its chapter.
    const per = new Map();
    for (const it of [...wrong, ...fixed]) per.set(it.chapter, (per.get(it.chapter) || 0) + 1);
    for (const [ch, cnt] of per) {
      await q('INSERT INTO learning_progress (user_id, chapter, answered) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE answered = answered + VALUES(answered)', [me.id, ch, cnt]);
    }
  }
  if (total > 0) {
    await q('INSERT INTO learning_activity (user_id, day, answers) VALUES (?, CURDATE(), ?) ON DUPLICATE KEY UPDATE answers = answers + VALUES(answers)', [me.id, total]);
  }
  for (const it of wrong) {
    await q('INSERT IGNORE INTO learning_mistakes (user_id, chapter, qidx) VALUES (?, ?, ?)', [me.id, it.chapter, it.qidx]);
  }
  for (const it of fixed) {
    await q('DELETE FROM learning_mistakes WHERE user_id = ? AND chapter = ? AND qidx = ?', [me.id, it.chapter, it.qidx]);
  }
  return ok({});
}

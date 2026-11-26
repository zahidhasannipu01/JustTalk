import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { chapterPractice, TOTAL_CHAPTERS } from '@/lib/learning';

const BATCH = 10;

// One batch of 10 practice questions for a chapter (the last batch may be
// shorter). qidx is the question's index in the chapter's practice list —
// the same id the mistakes list stores.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const sp = new URL(req.url).searchParams;
  const n = Number(sp.get('n'));
  const batch = Number(sp.get('batch') || 0);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_CHAPTERS) return fail('Bad chapter', 400);
  const list = chapterPractice(n);
  const batches = Math.max(1, Math.ceil(list.length / BATCH));
  if (!Number.isInteger(batch) || batch < 0 || batch >= batches) return fail('Bad batch', 400);
  const start = batch * BATCH;
  const questions = list.slice(start, start + BATCH).map((qq, i) => ({
    qidx: start + i, question: qq.question, options: qq.options, answer: qq.answer, explanation: qq.explanation,
  }));
  return ok({ n, batch, batches, total: list.length, questions });
}

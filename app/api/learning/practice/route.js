import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { chapterPractice, TOTAL_CHAPTERS } from '@/lib/learning';

const BATCH = 10;

// Practice questions for a chapter. Two forms: ?batch=k serves the k-th
// fixed batch of 10; ?from=i&count=m serves m questions starting at index
// i (the round form — count may be "all"). qidx is the question's index
// in the chapter's practice list — the same id the mistakes list stores.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const sp = new URL(req.url).searchParams;
  const n = Number(sp.get('n'));
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_CHAPTERS) return fail('Bad chapter', 400);
  const list = chapterPractice(n);
  if (sp.has('from') || sp.has('count')) {
    const from = Number(sp.get('from') || 0);
    const count = sp.get('count') === 'all' ? list.length : Number(sp.get('count') || 10);
    if (!Number.isInteger(from) || from < 0 || from >= Math.max(1, list.length)) return fail('Bad start', 400);
    if (!Number.isInteger(count) || count < 1 || count > 1000) return fail('Bad count', 400);
    const questions = list.slice(from, from + count).map((qq, i) => ({
      qidx: from + i, question: qq.question, options: qq.options, answer: qq.answer, explanation: qq.explanation,
    }));
    return ok({ n, from, total: list.length, questions });
  }
  const batch = Number(sp.get('batch') || 0);
  const batches = Math.max(1, Math.ceil(list.length / BATCH));
  if (!Number.isInteger(batch) || batch < 0 || batch >= batches) return fail('Bad batch', 400);
  const start = batch * BATCH;
  const questions = list.slice(start, start + BATCH).map((qq, i) => ({
    qidx: start + i, question: qq.question, options: qq.options, answer: qq.answer, explanation: qq.explanation,
  }));
  return ok({ n, batch, batches, total: list.length, questions });
}

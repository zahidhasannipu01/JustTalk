import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { chapterMeta, chapterPractice } from '@/lib/learning';

// The review set: every question the user has answered wrong and not yet
// fixed, each labelled with its chapter, in chapter/question order.
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const rows = await q('SELECT chapter, qidx FROM learning_mistakes WHERE user_id = ? ORDER BY chapter, qidx', [me.id]);
  const questions = [];
  for (const r of rows) {
    const ch = Number(r.chapter); const qi = Number(r.qidx);
    const qq = chapterPractice(ch)[qi];
    if (!qq) continue;
    questions.push({
      chapter: ch, chapterTitle: chapterMeta(ch).title, qidx: qi,
      question: qq.question, options: qq.options, answer: qq.answer, explanation: qq.explanation,
    });
  }
  return ok({ questions });
}

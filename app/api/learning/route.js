import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { allChapterMeta, bookTotals } from '@/lib/learning';

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Learning home: every chapter with the user's state, the four headline
// stats, this week's activity (Mon..Sun) and the per-chapter best scores.
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const prog = await q('SELECT chapter, rules_done, best_score, last_score, answered FROM learning_progress WHERE user_id = ?', [me.id]);
  const byCh = new Map(prog.map(r => [Number(r.chapter), r]));
  const chapters = allChapterMeta().map(c => {
    const p = byCh.get(c.n);
    return {
      ...c,
      rulesDone: !!(p && p.rules_done),
      best: p && p.best_score != null ? Number(p.best_score) : null,
      last: p && p.last_score != null ? Number(p.last_score) : null,
    };
  });
  const finished = chapters.filter(c => c.best != null).length;
  const answered = prog.reduce((s, r) => s + Number(r.answered || 0), 0);
  const bests = chapters.filter(c => c.best != null).map(c => c.best);
  const avgBest = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null;
  const [mist] = await q('SELECT COUNT(*) AS n FROM learning_mistakes WHERE user_id = ?', [me.id]);

  // Current week, Monday first — the weekly activity chart.
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const act = await q('SELECT day, answers FROM learning_activity WHERE user_id = ? AND day >= ? AND day <= ?', [me.id, iso(monday), iso(sunday)]);
  const byDay = new Map(act.map(r => [iso(new Date(r.day)), Number(r.answers)]));
  const week = [];
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); week.push(byDay.get(iso(d)) || 0); }

  const scores = chapters.filter(c => c.best != null).map(c => ({ n: c.n, best: c.best }));
  return ok({ chapters, stats: { finished, answered, avgBest, mistakes: Number(mist.n) }, week, scores, totals: bookTotals() });
}

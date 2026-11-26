// Structured English learning — the book "English for Competitive Exams"
// extracted into data/learning/chapter-NN.json (50 chapters). Loaded
// server-side only, parsed once and cached in module memory; API routes
// hand the client only the slice it asked for, never a whole file.
import fs from 'fs';
import path from 'path';

export const TOTAL_CHAPTERS = 50;
const DIR = path.join(process.cwd(), 'data', 'learning');
const cache = new Map();

function hasText(t) { return !!(t && (t.mix || t.en || t.bn)); }

// Practice set for a chapter: MCQs with a printed answer and all four
// options present, in book order. A question's stable id (qidx) is its
// index in this filtered list.
function practiceList(raw) {
  const out = [];
  for (const m of raw.mcqs || []) {
    if (!m || !m.answer) continue;
    const o = m.options || {};
    if (!hasText(o.a) || !hasText(o.b) || !hasText(o.c) || !hasText(o.d)) continue;
    out.push({
      question: m.question,
      options: { a: o.a, b: o.b, c: o.c, d: o.d },
      answer: m.answer,
      explanation: m.explanation || { mix: '', en: '', bn: '' },
    });
  }
  return out;
}

function loadChapter(n) {
  if (cache.has(n)) return cache.get(n);
  const file = path.join(DIR, `chapter-${String(n).padStart(2, '0')}.json`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = {
    n,
    title: String(raw.chapter || '').replace(/^Chapter-\d+:\s*/, ''),
    rules: Array.isArray(raw.rules) ? raw.rules : [],
    practice: practiceList(raw),
    totalMcqs: Array.isArray(raw.mcqs) ? raw.mcqs.length : 0,
  };
  cache.set(n, data);
  return data;
}

export function chapterMeta(n) {
  const c = loadChapter(n);
  return { n, title: c.title, rules: c.rules.length, questions: c.practice.length };
}
export function allChapterMeta() {
  const out = [];
  for (let i = 1; i <= TOTAL_CHAPTERS; i++) out.push(chapterMeta(i));
  return out;
}
export function chapterRules(n) { return loadChapter(n).rules; }
export function chapterPractice(n) { return loadChapter(n).practice; }
export function bookTotals() {
  let questions = 0;
  for (let i = 1; i <= TOTAL_CHAPTERS; i++) questions += loadChapter(i).totalMcqs;
  return { chapters: TOTAL_CHAPTERS, questions };
}

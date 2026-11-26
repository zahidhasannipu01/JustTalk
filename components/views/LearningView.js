'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, toast } from '@/lib/toast';
import { Ic } from '../icons';

// Structured English learning, from the book "English for Competitive
// Exams" (data/learning/*.json via /api/learning). Rules first, then
// practice in batches of 10; wrong answers collect into a review list.
// Every book text is {mix, en, bn} and renders in the chosen language.
const LANGS = [['mix', 'Mix'], ['en', 'English'], ['bn', 'বাংলা']];
const lt = (f, lang) => (f ? (f[lang] || f.mix || f.en || f.bn || '') : '');
const fmt = n => Number(n || 0).toLocaleString('en-US');

function LangToggle({ lang, setLang }) {
  return (
    <div className="ln-lang" role="group" aria-label="Language">
      {LANGS.map(([k, label]) => <button type="button" key={k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{label}</button>)}
    </div>
  );
}

/* ---------- "Watch it explained": an animated demo built from the rule's
   own text. (a) sentence demo when the body holds an example sentence —
   words appear one by one, a key word highlights, a label pill drops in,
   then a one-line why; (b) chips demo when the body holds a list; (c)
   spotlight demo over the body's sentences as the fallback. All stage
   text is pure white — see .ln-stage rules in globals.css. ---------- */
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'or', 'to', 'in', 'is', 'are', 'was', 'were', 'be', 'as', 'at', 'by', 'for', 'with', 'on', 'it', 'its', 'this', 'that', 'from', 'not', 'no']);
function splitSentences(text) {
  return String(text || '').split(/(?<=[।.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}
// Headings like "Introduction" carry no teachable term — a sentence demo
// labelled with one would be nonsense, so those rules fall through to the
// chips/spotlight demos instead.
const GENERIC_TERM = new Set(['introduction', 'definition', 'definitions', 'note', 'notes', 'overview', 'exercise', 'exercises', 'rule', 'rules', 'types', 'classification', 'miscellaneous', 'examples', 'example']);
function keyTermOf(heading) {
  const words = String(heading || '').match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const w = words.find(x => !STOP.has(x.toLowerCase())) || words[0] || '';
  return GENERIC_TERM.has(w.toLowerCase()) ? '' : w;
}
function findExample(body) {
  const text = String(body || '');
  const cands = [];
  for (const m of text.matchAll(/[‘'"]([^‘'"”]{6,90})[’'"”]/g)) cands.push({ s: m[1].trim(), i: m.index, q: true });
  for (const m of text.matchAll(/[A-Za-z][A-Za-z0-9 ,.'’\-]{8,110}/g)) cands.push({ s: m[0].trim(), i: m.index, q: false });
  const valid = cands
    .map(c => ({ ...c, s: c.s.replace(/[\s.]+$/, ''), n: c.s.split(/\s+/).filter(Boolean).length }))
    .filter(c => c.n >= 4 && c.n <= 11 && !/https?:/.test(c.s));
  if (!valid.length) return '';
  const quoted = valid.filter(c => c.q);
  if (quoted.length) return quoted[0].s;
  // Prefer the example the book itself flags ("For example — …", "যেমন— …").
  const marker = Math.max(text.toLowerCase().lastIndexOf('example'), text.indexOf('যেমন'));
  const after = valid.filter(c => c.i > marker).sort((a, b) => a.i - b.i);
  if (marker >= 0 && after.length) return after[0].s;
  return valid.sort((a, b) => a.n - b.n)[0].s;
}
function findChips(body) {
  const segs = String(body || '').split(/[:—–]\s*/);
  for (const seg of segs.slice(1)) {
    const items = seg.split(/[,;]/).map(s => s.trim().replace(/[।.]$/, '')).filter(s => s && s.split(/\s+/).length <= 5);
    if (items.length >= 3) return items.slice(0, 8);
  }
  return null;
}
function buildDemo(heading, body) {
  try {
    const ex = findExample(body);
    const term = keyTermOf(heading);
    if (ex && term) {
      const words = ex.split(/\s+/);
      let ki = term ? words.findIndex(w => w.replace(/[^A-Za-z'-]/g, '').toLowerCase() === term.toLowerCase()) : -1;
      if (ki < 0) { ki = 0; let best = 0; words.forEach((w, i) => { const L = w.replace(/[^A-Za-z]/g, '').length; if (L > best) { best = L; ki = i; } }); }
      const keyWord = words[ki].replace(/[^A-Za-z'-]/g, '') || words[ki];
      return { kind: 'sentence', words, keyIdx: ki, pill: term ? `${keyWord} = ${term}` : keyWord, why: splitSentences(body)[0] || '' };
    }
    const chips = findChips(body);
    if (chips) return { kind: 'chips', chips };
    const sents = splitSentences(body);
    if (sents.length) return { kind: 'spot', sents: sents.slice(0, 6) };
  } catch {}
  return { kind: 'spot', sents: [String(body || '')] };
}
function demoSteps(demo) {
  if (demo.kind === 'sentence') return demo.words.length + 3;
  if (demo.kind === 'chips') return demo.chips.length;
  return demo.sents.length;
}

function AnimStage({ demo }) {
  const total = demoSteps(demo);
  const last = Math.max(0, total - 1);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const rm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStep(rm ? last : 0);
    setPlaying(!rm && last > 0);
  }, [demo, last]);
  useEffect(() => {
    if (!playing) return;
    if (step >= last) { setPlaying(false); return; }
    const t = setTimeout(() => setStep(s => Math.min(last, s + 1)), 1000);
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const nw = demo.kind === 'sentence' ? demo.words.length : 0;
  return (
    <div className="ln-stage">
      <div className="ln-stage-body">
        {demo.kind === 'sentence' && (
          <>
            <div className="ln-pill-slot">{step >= nw + 1 ? <span className="ln-pill">{demo.pill}</span> : null}</div>
            <p className="ln-sent">
              {demo.words.map((w, i) => (
                <span key={i} className={`ln-w ${i <= Math.min(step, nw - 1) ? 'on' : ''} ${i === demo.keyIdx && step >= nw ? 'hl' : ''}`}>{w}{i < nw - 1 ? ' ' : ''}</span>
              ))}
            </p>
            {step >= nw + 2 && demo.why ? <p className="ln-why">{demo.why}</p> : null}
          </>
        )}
        {demo.kind === 'chips' && (
          <div className="ln-achips">
            {demo.chips.map((c, i) => <span key={i} className={`ln-achip ${i <= step ? 'on' : ''}`}>{c}</span>)}
          </div>
        )}
        {demo.kind === 'spot' && (
          <div className="ln-spot">
            {demo.sents.slice(0, step + 1).map((s, i) => <p key={i} className={`ln-spot-s ${i === step ? 'now' : ''}`}>{s}</p>)}
          </div>
        )}
      </div>
      <div className="ln-stage-bar">
        <button type="button" className="ln-sbtn" aria-label="Previous step" onClick={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }}>‹</button>
        <button type="button" className="ln-sbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => { if (!playing && step >= last) setStep(0); setPlaying(p => !p); }}><Ic n={playing ? 'pause' : 'play'} size={15} /></button>
        <button type="button" className="ln-sbtn" aria-label="Next step" onClick={() => { setPlaying(false); setStep(s => Math.min(last, s + 1)); }}>›</button>
        <button type="button" className="ln-sbtn ln-sbtn-txt" onClick={() => { setStep(0); setPlaying(true); }}>Replay</button>
        <span className="ln-stage-count">Step {step + 1} of {total}</span>
      </div>
    </div>
  );
}

function RuleCard({ rule, lang }) {
  const heading = lt(rule.heading, lang);
  const body = lt(rule.body, lang);
  const [open, setOpen] = useState(false);
  const demo = useMemo(() => buildDemo(heading, body), [heading, body]);
  return (
    <div className="ln-rule">
      {heading ? <h4>{heading}</h4> : null}
      <p className="ln-rule-body">{body}</p>
      <button type="button" className="ln-watch" onClick={() => setOpen(o => !o)}><Ic n="play" size={13} />Watch it explained</button>
      {open ? <AnimStage demo={demo} /> : null}
    </div>
  );
}

/* ---------- Practice runner: one question at a time, instant right/wrong
   with the explanation, shared by chapter batches and mistakes review. */
function QuizRunner({ quiz, lang, onDone, onExit }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [tally, setTally] = useState({ correct: 0, wrong: [], fixed: [] });
  const [saving, setSaving] = useState(false);
  const qs = quiz.questions;
  const q = qs[idx];
  const isLast = idx === qs.length - 1;

  function pick(letter) {
    if (picked) return;
    setPicked(letter);
    const right = letter === q.answer;
    const key = quiz.mode === 'review' ? { chapter: q.chapter, qidx: q.qidx } : q.qidx;
    const wasMistake = quiz.mode === 'review' || quiz.mistakeQidx.has(q.qidx);
    setTally(t => ({
      correct: t.correct + (right ? 1 : 0),
      wrong: !right && !wasMistake ? [...t.wrong, key] : t.wrong,
      fixed: right && wasMistake ? [...t.fixed, key] : t.fixed,
    }));
  }
  async function next() {
    if (!isLast) { setIdx(i => i + 1); setPicked(null); return; }
    setSaving(true);
    try {
      await api('/api/learning/result', {
        method: 'POST',
        body: { chapter: quiz.mode === 'review' ? null : quiz.chapter, correct: tally.correct, total: qs.length, wrong: tally.wrong, fixed: tally.fixed },
      });
    } catch (e) { toast(e.message); }
    setSaving(false);
    onDone({ correct: tally.correct, total: qs.length, fixedCount: tally.fixed.length, wrongCount: tally.wrong.length });
  }

  return (
    <div className="ln-quiz">
      <div className="ln-quiz-top">
        <span className="ln-quiz-title">{quiz.mode === 'review' ? 'Review mistakes' : `Chapter ${quiz.chapter} · Batch ${quiz.batch + 1}`}</span>
        <span className="ln-quiz-count">Question {idx + 1} of {qs.length}</span>
        <button type="button" className="ln-quiz-x" aria-label="Close" onClick={onExit}><Ic n="close" size={16} /></button>
      </div>
      <div className="ln-qbar"><i style={{ width: `${((idx + (picked ? 1 : 0)) / qs.length) * 100}%` }}></i></div>
      {quiz.mode === 'review' ? <span className="ln-qchip">Chapter {q.chapter} · {q.chapterTitle}</span> : null}
      <p className="ln-qtext">{lt(q.question, lang)}</p>
      <div className="ln-opts">
        {['a', 'b', 'c', 'd'].map(letter => {
          const cls = !picked ? '' : letter === q.answer ? 'right' : letter === picked ? 'wrong' : 'dim';
          return (
            <button type="button" key={letter} className={`ln-opt ${cls}`} onClick={() => pick(letter)} disabled={!!picked}>
              <span className="ln-opt-k">{letter.toUpperCase()}</span><span>{lt(q.options[letter], lang)}</span>
            </button>
          );
        })}
      </div>
      {picked ? (
        <>
          <p className={`ln-verdict ${picked === q.answer ? 'ok' : 'no'}`}>{picked === q.answer ? 'Correct' : 'Not quite'}</p>
          {lt(q.explanation, lang) ? <div className="ln-expl"><b>Why</b><p>{lt(q.explanation, lang)}</p></div> : null}
          <button type="button" className="btn-accent2 ln-next" onClick={next} disabled={saving}>{isLast ? 'See result' : 'Next question'}</button>
        </>
      ) : null}
    </div>
  );
}

export default function LearningView() {
  const [lang, setLangState] = useState('mix');
  const [home, setHome] = useState(null);
  const [screen, setScreen] = useState('home'); // home | chapters | chapter | quiz | result
  const [ch, setCh] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);

  function setLang(k) {
    setLangState(k);
    try { localStorage.setItem('ln-lang', k); } catch {}
  }
  useEffect(() => {
    try { const s = localStorage.getItem('ln-lang'); if (s && LANGS.some(([k]) => k === s)) setLangState(s); } catch {}
    loadHome();
  }, []);
  async function loadHome() {
    try { setHome(await api('/api/learning')); } catch (e) { toast(e.message); }
  }
  async function openChapter(n) {
    try { setCh(await api(`/api/learning/chapter?n=${n}`)); setScreen('chapter'); } catch (e) { toast(e.message); }
  }
  async function markRulesDone() {
    try {
      await api('/api/learning/rules-done', { method: 'POST', body: { chapter: ch.n } });
      setCh({ ...ch, rulesDone: true });
      loadHome();
    } catch (e) { toast(e.message); }
  }
  async function startPractice(batch) {
    try {
      const d = await api(`/api/learning/practice?n=${ch.n}&batch=${batch}`);
      if (!d.questions.length) { toast('No questions in this batch'); return; }
      setQuiz({ mode: 'chapter', chapter: ch.n, batch, questions: d.questions, mistakeQidx: new Set(ch.mistakeQidx || []) });
      setScreen('quiz');
    } catch (e) { toast(e.message); }
  }
  async function startReview() {
    try {
      const d = await api('/api/learning/mistakes');
      if (!d.questions.length) { toast('Nothing to review'); return; }
      setQuiz({ mode: 'review', questions: d.questions, mistakeQidx: new Set() });
      setScreen('quiz');
    } catch (e) { toast(e.message); }
  }
  async function refreshChapter(n) {
    try { setCh(await api(`/api/learning/chapter?n=${n}`)); } catch {}
  }
  function quizDone(info) {
    const doneQuiz = quiz;
    setResult({ ...info, mode: doneQuiz.mode, chapter: doneQuiz.chapter, batch: doneQuiz.batch });
    setQuiz(null);
    loadHome();
    if (doneQuiz.mode === 'chapter' && doneQuiz.chapter) refreshChapter(doneQuiz.chapter);
    setScreen('result');
  }

  if (!home) return <p className="ln-note">Loading…</p>;
  const { stats, totals } = home;
  const finishedPct = totals.chapters ? Math.round((stats.finished / totals.chapters) * 100) : 0;
  const inProgress = home.chapters.filter(c => c.best == null && c.rulesDone).length;
  const notStarted = totals.chapters - stats.finished - inProgress;
  const weekMax = Math.max(1, ...home.week);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const titleOf = n => (home.chapters.find(c => c.n === n) || {}).title || '';

  if (screen === 'quiz' && quiz) {
    return <QuizRunner quiz={quiz} lang={lang} onDone={quizDone} onExit={() => { setQuiz(null); setScreen(quiz.mode === 'review' ? 'home' : 'chapter'); }} />;
  }

  if (screen === 'result' && result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0;
    const remaining = home.stats.mistakes;
    return (
      <div className="ln-wrap">
        <div className="ln-result">
          {result.mode === 'review' ? (
            <>
              <span className="ln-result-ic"><Ic n="check" size={24} /></span>
              <h3>Review done</h3>
              <p>You fixed <b>{result.fixedCount}</b> of {result.total} — <b>{remaining}</b> still to review.</p>
              <div className="ln-result-actions">
                {remaining > 0 ? <button type="button" className="btn-accent2" onClick={startReview}>Review remaining</button> : null}
                <button type="button" className="btn-soft" onClick={() => setScreen('home')}>Back to Learning</button>
              </div>
            </>
          ) : (
            <>
              <span className="ln-result-ic"><Ic n="check" size={24} /></span>
              <h3>{result.correct} / {result.total} · {pct}%</h3>
              <p>Chapter {result.chapter} · Batch {result.batch + 1} — your score is saved.</p>
              <div className="ln-result-actions">
                {ch && result.batch + 1 < ch.batches ? <button type="button" className="btn-accent2" onClick={() => startPractice(result.batch + 1)}>Next batch</button> : null}
                {remaining > 0 ? <button type="button" className="btn-soft" onClick={startReview}>Review mistakes ({remaining})</button> : null}
                <button type="button" className="btn-soft" onClick={() => setScreen('chapter')}>Back to chapter</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'chapter' && ch) {
    return (
      <div className="ln-wrap">
        <div className="ln-toprow">
          <button type="button" className="ln-back" onClick={() => setScreen('chapters')}>‹ All chapters</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="ln-chhead"><span>Chapter {ch.n}</span><h3>{ch.title}</h3></div>
        <h4 className="ln-sec">Rules</h4>
        <div className="ln-rules">
          {ch.rules.map((r, i) => <RuleCard key={i} rule={r} lang={lang} />)}
        </div>
        {!ch.rulesDone ? (
          <button type="button" className="btn-accent2 ln-markdone" onClick={markRulesDone}>Mark rules as finished</button>
        ) : (
          <div className="ln-practice">
            <div className="ln-practice-head">
              <h4>Practice</h4>
              <span>{ch.best != null ? `Best ${ch.best}%` : ''}{ch.last != null ? ` · Last ${ch.last}%` : ''} · {fmt(ch.practiceTotal)} questions</span>
            </div>
            <button type="button" className="btn-accent2 ln-continue" onClick={() => startPractice(ch.nextBatch)}>
              {ch.nextBatch > 0 || ch.best != null ? 'Continue' : 'Start'} · Batch {ch.nextBatch + 1}
            </button>
            <div className="ln-batches">
              {Array.from({ length: ch.batches }, (_, i) => (
                <button type="button" key={i} className={i === ch.nextBatch ? 'on' : ''} onClick={() => startPractice(i)}>Batch {i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'chapters') {
    return (
      <div className="ln-wrap">
        <div className="ln-toprow">
          <button type="button" className="ln-back" onClick={() => setScreen('home')}>‹ Learning</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="ln-chlist">
          {home.chapters.map(c => (
            <button type="button" key={c.n} className="ln-chrow" onClick={() => openChapter(c.n)}>
              <span className="ln-chn">{c.n}</span>
              <span className="ln-chrow-txt"><b>{c.title}</b><small>{fmt(c.rules)} rules · {fmt(c.questions)} questions</small></span>
              {c.best != null ? <span className="ln-state done">Best {c.best}%</span> : c.rulesDone ? <span className="ln-state mid">Rules done</span> : <span className="ln-state">Not started</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Home
  const C = 2 * Math.PI * 52;
  return (
    <div className="ln-wrap">
      <div className="ln-toprow"><span></span><LangToggle lang={lang} setLang={setLang} /></div>
      <button type="button" className="ln-subject" onClick={() => setScreen('chapters')}>
        <span className="ln-subject-ic"><Ic n="book" size={26} /></span>
        <span className="ln-subject-txt">
          <b>Academic English</b>
          <small>Grammar &amp; vocabulary — rules first, then practice with an explanation for every answer</small>
          <span className="ln-subject-meta">{totals.chapters} CHAPTERS · {fmt(totals.questions)} QUESTIONS</span>
          <span className="ln-bar"><i style={{ width: `${finishedPct}%` }}></i></span>
          <span className="ln-subject-fin">{stats.finished} of {totals.chapters} chapters finished</span>
        </span>
        <span className="ln-chev">›</span>
      </button>

      <div className="ln-steps">
        {[['1', 'Read the rules', 'Short rule blocks, in the language you like'], ['2', 'Mark them finished', 'Practice unlocks when you are ready'], ['3', 'Practise & score', '10 questions at a time · your score is saved']].map(([n, t, s]) => (
          <div className="ln-step" key={n}><span className="ln-step-n">{n}</span><b>{t}</b><small>{s}</small></div>
        ))}
      </div>

      <div className="ln-stats">
        <div className="ln-stat"><b>{stats.finished}</b><small>chapters finished</small></div>
        <div className="ln-stat"><b>{fmt(stats.answered)}</b><small>questions answered</small></div>
        <div className="ln-stat"><b>{stats.avgBest != null ? `${stats.avgBest}%` : '—'}</b><small>average best score</small></div>
        {stats.mistakes > 0 ? (
          <button type="button" className="ln-stat ln-stat-btn" onClick={startReview}><b>{stats.mistakes}</b><small>mistakes to review</small></button>
        ) : (
          <div className="ln-stat"><b>0</b><small>mistakes to review</small></div>
        )}
      </div>

      <div className="ln-graphs">
        <div className="ln-gcard">
          <h4>Your progress</h4>
          <div className="ln-ring-wrap">
            <div className="ln-ring">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" className="ln-ring-bg" />
                <circle cx="60" cy="60" r="52" className="ln-ring-fg" strokeDasharray={`${(finishedPct / 100) * C} ${C}`} transform="rotate(-90 60 60)" />
              </svg>
              <span className="ln-ring-txt"><b>{finishedPct}%</b><small>of the book</small></span>
            </div>
            <div className="ln-legend">
              <span><i className="dot fin"></i>Finished<b>{stats.finished}</b></span>
              <span><i className="dot prog"></i>In progress<b>{inProgress}</b></span>
              <span><i className="dot not"></i>Not started<b>{notStarted}</b></span>
            </div>
          </div>
        </div>
        <div className="ln-gcard">
          <h4>This week</h4>
          <div className="ln-week">
            {home.week.map((v, i) => (
              <div className="ln-wcol" key={i}>
                <span className="ln-wval">{v || ''}</span>
                <span className={`ln-wbar ${i === todayIdx ? 'today' : ''}`} style={{ height: `${Math.max(4, (v / weekMax) * 100)}%` }}></span>
                <small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</small>
              </div>
            ))}
          </div>
          <p className="ln-gnote">Questions answered per day</p>
        </div>
      </div>

      <div className="ln-gcard ln-scores">
        <h4>Chapter scores</h4>
        {home.scores.length === 0 ? <p className="ln-gnote">No chapter scores yet — finish a practice batch and your best scores will show here.</p> : (
          <div className="ln-srows">
            {home.scores.map(s => (
              <div className="ln-srow" key={s.n}>
                <span className="ln-slabel">Ch {s.n} · {titleOf(s.n)}</span>
                <span className="ln-strack"><i className={s.best >= 80 ? 'g' : s.best >= 50 ? 'a' : 'o'} style={{ width: `${s.best}%` }}></i></span>
                <b>{s.best}%</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, toast } from '@/lib/toast';
import { Ic } from '../icons';

// Structured English learning, from the book "English for Competitive
// Exams" (data/learning/*.json via /api/learning). Rules first, then
// practice in rounds; wrong answers collect into a review list.
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

/* ---------- "Watch it explained": an animated demo for each rule.
   Hand-built demos for the core rules come first (HAND below, keyed by
   chapter:ruleIndex — the book's own classic examples, same as the
   preview). Everything else is generated from the rule's own text:
   a word-building (morph) demo when the body holds singular–plural
   pairs, a sentence demo when the body holds an example sentence
   (words appear one by one, the key word highlights, a label pill
   drops in, then a one-line why), a chips demo when the body holds
   a list, and a spotlight demo over the body's sentences only when
   no example exists at all. All stage text is pure white — see the
   .ln-stage rules in globals.css. ---------- */
const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'or', 'to', 'in', 'is', 'are', 'was', 'were', 'be', 'as', 'at', 'by', 'for', 'with', 'on', 'it', 'its', 'this', 'that', 'from', 'not', 'no']);
function splitSentences(text) {
  return String(text || '').split(/(?<=[।.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}
// Headings like "Introduction" carry no teachable term on their own.
const GENERIC_TERM = new Set(['introduction', 'definition', 'definitions', 'note', 'notes', 'overview', 'exercise', 'exercises', 'rule', 'rules', 'types', 'classification', 'miscellaneous', 'examples', 'example']);
function keyTermOf(heading) {
  const words = String(heading || '').match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const w = words.find(x => !STOP.has(x.toLowerCase())) || words[0] || '';
  return GENERIC_TERM.has(w.toLowerCase()) ? '' : w;
}
function termOf(heading, bodyEn) {
  let t = keyTermOf(heading);
  if (t) return t;
  const m = String(bodyEn || '').match(/(?:called|known as)\s+(?:a\s+|an\s+|the\s+)?([A-Z][a-z]+)/);
  if (m && !GENERIC_TERM.has(m[1].toLowerCase())) return m[1];
  const words = String(heading || '').match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const last = words[words.length - 1] || '';
  return last && !STOP.has(last.toLowerCase()) && !GENERIC_TERM.has(last.toLowerCase()) ? last : '';
}
const CAP_EX = { mix: 'উদাহরণটা দেখো', en: 'Watch the example', bn: 'উদাহরণটা দেখো' };
const CAP_RULE = { mix: 'নিয়মটা দেখো', en: 'Watch the rule', bn: 'নিয়মটা দেখো' };

/* Hand-built demos for the core rules, from the book's own classic
   examples — the same demos as the preview. Example sentences stay in
   English (they are the book's); captions and whys follow the UI
   language (mix / en / bn). */
const HAND = {
  '1:0': { kind: 'pair', caption: { mix: 'এবার এই WORD-টার দিকে তাকাও', en: 'Now look at this WORD', bn: 'এবার এই WORD-টার দিকে তাকাও' },
    parts: [
      { sent: 'Water is life.', keys: [0], pill: 'water = Noun' },
      { sent: 'I water the plants.', keys: [1], pill: 'water = Verb' },
    ] },
  '1:1': { kind: 'sentence', sent: 'Karim reads a book.', keys: [0, 3], pill: 'Karim · book = Noun', caption: CAP_EX,
    why: { mix: 'Karim একজন মানুষের নাম, book একটি বস্তুর নাম — নাম বোঝালেই Noun।', en: "Karim is a person's name, book is a thing's name — a name means a Noun.", bn: 'Karim একজন মানুষের নাম, book একটি বস্তুর নাম — নাম বোঝালেই Noun।' } },
  '2:1': { kind: 'chips', chips: ['Karim', 'Dhaka', 'man', 'flower', 'planet', 'team', 'iron', 'water'], caption: { mix: 'Noun-এর উদাহরণ', en: 'Examples of nouns', bn: 'Noun-এর উদাহরণ' },
    why: { mix: 'ব্যক্তি, বস্তু, স্থান বা কাজের নামই Noun।', en: 'The name of a person, thing, place or action is a noun.', bn: 'ব্যক্তি, বস্তু, স্থান বা কাজের নামই Noun।' } },
  '3:1': { kind: 'chips', chips: ['He', 'this', 'who', 'what', 'some', 'all', 'each', 'himself'], caption: { mix: 'Pronoun-এর উদাহরণ', en: 'Examples of pronouns', bn: 'Pronoun-এর উদাহরণ' },
    why: { mix: 'Noun-এর পরিবর্তে ব্যবহৃত শব্দই Pronoun।', en: 'A word used in place of a noun is a pronoun.', bn: 'Noun-এর পরিবর্তে ব্যবহৃত শব্দই Pronoun।' } },
  '4:3': { kind: 'chips', chips: ['good', 'beautiful', 'strong', 'weak', 'ugly', 'bad'], caption: { mix: 'Adjective of Quality', en: 'Adjective of Quality', bn: 'Adjective of Quality' },
    why: { mix: 'এই শব্দগুলো Noun বা Pronoun-এর গুণ বা অবস্থা বোঝায়।', en: 'These words express the quality or state of a noun or pronoun.', bn: 'এই শব্দগুলো Noun বা Pronoun-এর গুণ বা অবস্থা বোঝায়।' } },
  '5:1': { kind: 'chips', chips: ['eat', 'see', 'catch', 'walk'], caption: { mix: 'Verb-এর উদাহরণ', en: 'Examples of verbs', bn: 'Verb-এর উদাহরণ' },
    why: { mix: 'কোনো কাজ করা বোঝায় এমন শব্দই Verb।', en: 'A word that expresses doing some work is a verb.', bn: 'কোনো কাজ করা বোঝায় এমন শব্দই Verb।' } },
  '6:1': { kind: 'morph', caption: { mix: 'শেষে s যোগ করে Plural', en: 'Add s to make it plural', bn: 'শেষে s যোগ করে Plural' },
    items: [
      { base: 'Book', add: 's', result: 'Books' },
      { base: 'Pen', add: 's', result: 'Pens' },
      { base: 'Boy', add: 's', result: 'Boys' },
      { base: 'Cat', add: 's', result: 'Cats' },
    ],
    why: { mix: 'সাধারণত শব্দের শেষে s যোগ করলেই Plural হয়।', en: 'Generally, adding s at the end makes a noun plural.', bn: 'সাধারণত শব্দের শেষে s যোগ করলেই Plural হয়।' } },
  '7:1': { kind: 'chips', chips: ['tea', 'sugar', 'water', 'air', 'rice', 'milk', 'sand', 'salt'], caption: { mix: 'Uncountable Nouns', en: 'Uncountable nouns', bn: 'Uncountable Nouns' },
    why: { mix: 'এই Noun গুলো গোনা যায় না।', en: 'These nouns cannot be counted.', bn: 'এই Noun গুলো গোনা যায় না।' } },
  '8:1': { kind: 'chips', chips: ['Masculine', 'Feminine', 'Common', 'Neuter'], caption: { mix: 'Gender-এর প্রকার', en: 'Kinds of gender', bn: 'Gender-এর প্রকার' },
    why: { mix: 'Gender প্রধানত চার প্রকার।', en: 'Gender is mainly of four kinds.', bn: 'Gender প্রধানত চার প্রকার।' } },
  '9:0': { kind: 'chips', chips: ['a', 'an', 'many', 'much', 'few', 'little'], caption: { mix: 'Determiners', en: 'Determiners', bn: 'Determiners' },
    why: { mix: 'এই শব্দগুলো Noun-এর নির্দিষ্টতা, সংখ্যা বা পরিমাণ বোঝায়।', en: 'These words show the definiteness, number or quantity of a noun.', bn: 'এই শব্দগুলো Noun-এর নির্দিষ্টতা, সংখ্যা বা পরিমাণ বোঝায়।' } },
  '19:0': { kind: 'sentence', sent: 'If you heat water to 100 degrees Celsius, it boils.', keys: [0], pill: 'If → Conditional', caption: CAP_EX,
    why: { mix: 'If-যুক্ত অংশটা If Clause (শর্ত), বাকি অংশ Main Clause (ফল)।', en: 'The part with If is the If Clause (the condition); the rest is the Main Clause (the result).', bn: 'If-যুক্ত অংশটা If Clause (শর্ত), বাকি অংশ Main Clause (ফল)।' } },
  '20:1': { kind: 'pair', caption: { mix: 'Active থেকে Passive', en: 'Active → Passive', bn: 'Active থেকে Passive' },
    parts: [
      { sent: 'I eat rice.', keys: [1], pill: 'Active Voice' },
      { sent: 'Rice is eaten by me.', keys: [2], pill: 'Passive Voice' },
    ],
    why: { mix: 'Passive-এ Object (rice) Subject হয়ে যায়, verb হয় be + V3 (eaten)।', en: 'In the passive, the object (rice) becomes the subject and the verb becomes be + past participle (eaten).', bn: 'Passive-এ Object (rice) Subject হয়ে যায়, verb হয় be + V3 (eaten)।' } },
  '22:0': { kind: 'sentence', sent: "You like mangoes, don't you?", keys: [3, 4], pill: "don't you? = Tag Question", caption: CAP_EX,
    why: { mix: 'Positive statement-এর tag হয় negative।', en: 'A positive statement takes a negative tag.', bn: 'Positive statement-এর tag হয় negative।' } },
};
function resolveHand(h, lang) {
  const d = { kind: h.kind, caption: lt(h.caption, lang) };
  if (h.why) d.why = lt(h.why, lang);
  if (h.kind === 'sentence') { d.words = h.sent.split(/\s+/); d.keys = h.keys || [0]; d.pill = h.pill; }
  if (h.kind === 'pair') d.parts = h.parts.map(p => ({ words: p.sent.split(/\s+/), keys: p.keys || [], pill: p.pill }));
  if (h.kind === 'chips') d.chips = h.chips;
  if (h.kind === 'morph') d.items = h.items;
  return d;
}
function isExampleSent(s, minWords = 4) {
  const w = String(s || '').split(/\s+/).filter(Boolean);
  if (w.length < minWords || w.length > 12) return false;
  const low = s.toLowerCase();
  if (/called|example|http|structure|refers to|known as|examination|chapter|discussion|questions/.test(low)) return false;
  if ((s.match(/,/g) || []).length >= 3 || /etc\.?$/.test(low) || /:/.test(s)) return false;
  if (/^(read|note|remember|see|compare|there is|there are)\b/i.test(s)) return false;
  return true;
}
function extractExample(bodyEn, bodyCur) {
  const text = String(bodyEn || '');
  const finish = s => { const c = s.replace(/\s+/g, ' ').replace(/^[—–\-:;,\s]+/, '').replace(/[।]$/, '').trim(); return /[.!?]$/.test(c) ? c : c + '.'; };
  // 1) The sentence the book itself flags after "For example".
  const mi = text.toLowerCase().lastIndexOf('for example');
  if (mi >= 0) {
    const after = text.slice(mi + 'for example'.length).replace(/^[—–\-:;,\s]+/, '');
    const first = (after.split(/(?<=[.!?])\s+/)[0] || '').trim();
    if (isExampleSent(first, 3)) return finish(first);
  }
  // 2) A quoted example sentence.
  for (const m of text.matchAll(/[‘'"]([^‘'"”]{10,110})[’'"”]/g)) {
    if (isExampleSent(m[1].trim())) return finish(m[1].trim());
  }
  // 3) A plain example sentence later in the body (the first sentence is
  //    usually the definition). Require it to look like a real example:
  //    a name mid-sentence, a pronoun, or Name + be-verb at the start.
  for (const s of splitSentences(text).slice(1)) {
    const c = s.replace(/[।]$/, '.');
    if (!isExampleSent(c)) continue;
    const words = c.split(/\s+/);
    const midCap = words.slice(1).some(w => /^[A-Z]/.test(w));
    if (midCap || /\b(I|you|he|she|we|they|my|his|her|their|our)\b/i.test(c) || /^[A-Z][a-z]+\s+(is|are|was|were|has|have|had)\b/.test(c)) return finish(c);
  }
  // 4) A Latin-script example embedded in the current-language body
  //    (the mix/bn text often carries the book's English example).
  for (const s of (String(bodyCur || '').match(/[A-Za-z][A-Za-z0-9 ,.'’\-?!]{12,130}/g) || [])) {
    if (isExampleSent(s.trim())) return finish(s.trim());
  }
  return '';
}
function pickKey(words, term, bodyEn) {
  const clean = w => w.replace(/[^A-Za-z'-]/g, '');
  if (term) {
    let i = words.findIndex(w => clean(w).toLowerCase() === term.toLowerCase());
    if (i < 0) i = words.findIndex(w => clean(w).toLowerCase().startsWith(term.toLowerCase()));
    if (i >= 0) return i;
  }
  const qm = String(bodyEn || '').match(/(?:word|শব্দ)\s*[‘'"]([A-Za-z]+)[’'"]/) || String(bodyEn || '').match(/[‘'"]([A-Za-z]{2,})[’'"]/);
  if (qm) { const i = words.findIndex(w => clean(w).toLowerCase() === qm[1].toLowerCase()); if (i >= 0) return i; }
  const be = words.findIndex(w => /^(is|are|was|were)$/i.test(clean(w)));
  if (be >= 0) { for (let i = be + 1; i < words.length; i++) { const c = clean(words[i]); if (c && !STOP.has(c.toLowerCase()) && !/^(as|so)$/i.test(c)) return i; } }
  let ki = 0, best = 0;
  words.forEach((w, i) => { const c = clean(w); if (!STOP.has(c.toLowerCase()) && c.length > best) { best = c.length; ki = i; } });
  return ki;
}
function findMorph(text) {
  const pairs = [];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  for (const m of String(text || '').matchAll(/([A-Za-z]{2,})\s*[–—]\s*([A-Za-z]{2,})/g)) {
    const a = m[1], b = m[2];
    if (b.toLowerCase() === a.toLowerCase() + 's' || b.toLowerCase() === a.toLowerCase() + 'es') pairs.push({ base: cap(a), add: b.slice(a.length), result: cap(b) });
  }
  return pairs.length ? pairs.slice(0, 4) : null;
}
function findChips(body) {
  const text = String(body || '');
  const mi = text.toLowerCase().lastIndexOf('for example');
  const zones = mi >= 0 ? [text.slice(mi), text] : [text];
  for (const z of zones) {
    const chunk = z.split(/[।.!?\n]/)[0] || '';
    const items = chunk.replace(/^[^—:–-]*[—:–-]/, '').split(/[,;]/).map(s => s.trim().replace(/\s*etc\.?$/i, '').replace(/[।.]$/, '')).filter(s => s && !/:/.test(s) && !/example/i.test(s) && s.split(/\s+/).length <= 4 && s.length <= 26);
    if (items.length >= 3) return items.slice(0, 8);
  }
  const segs = text.split(/[:—–]\s*/);
  for (const seg of segs.slice(1)) {
    const items = seg.split(/[,;]/).map(s => s.trim().replace(/[।.]$/, '')).filter(s => s && s.split(/\s+/).length <= 5);
    if (items.length >= 3) return items.slice(0, 8);
  }
  return null;
}
function buildDemo(rule, lang, chn, ri) {
  try {
    const hand = HAND[`${chn}:${ri}`];
    if (hand) return resolveHand(hand, lang);
    const headingEn = lt(rule.heading, 'en');
    const bodyEn = lt(rule.body, 'en') || lt(rule.body, 'mix');
    const bodyCur = lt(rule.body, lang);
    const term = termOf(headingEn, bodyEn);
    const why = splitSentences(bodyCur)[0] || '';
    const morph = findMorph(bodyEn) || findMorph(bodyCur);
    if (morph) return { kind: 'morph', items: morph, caption: lt(CAP_EX, lang), why };
    const ex = extractExample(bodyEn, bodyCur);
    if (ex) {
      const words = ex.split(/\s+/);
      const ki = pickKey(words, term, bodyEn);
      const keyWord = words[ki].replace(/[^A-Za-z'-]/g, '') || words[ki];
      return { kind: 'sentence', words, keys: [ki], pill: term ? `${keyWord} = ${term}` : keyWord, caption: lt(CAP_EX, lang), why };
    }
    const chips = findChips(bodyEn) || findChips(bodyCur);
    if (chips) return { kind: 'chips', chips, caption: lt(CAP_EX, lang), why };
    const sents = splitSentences(bodyCur);
    if (sents.length) return { kind: 'spot', sents: sents.slice(0, 6), caption: lt(CAP_RULE, lang) };
  } catch {}
  return { kind: 'spot', sents: [lt(rule.body, lang)], caption: lt(CAP_RULE, lang) };
}
function demoSteps(demo) {
  if (demo.kind === 'sentence') return demo.words.length + (demo.why ? 3 : 2);
  if (demo.kind === 'pair') return demo.parts.reduce((a, p) => a + p.words.length + 2, 0) + (demo.why ? 1 : 0);
  if (demo.kind === 'morph') return demo.items.length * 3 + (demo.why ? 1 : 0);
  if (demo.kind === 'chips') return demo.chips.length + (demo.why ? 1 : 0);
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

  const pct = total > 1 ? ((step + 1) / total) * 100 : 100;
  let off = 0;
  const offs = demo.kind === 'pair' ? demo.parts.map(p => { const o = off; off += p.words.length + 2; return o; }) : [];
  const keysOf = d => d.keys || [d.keyIdx || 0];
  return (
    <div className="ln-stage">
      {demo.caption ? <div className="ln-stage-cap">{demo.caption}</div> : null}
      <div className="ln-stage-prog"><i style={{ width: `${pct}%` }}></i></div>
      <div className="ln-stage-body">
        {demo.kind === 'sentence' && (
          <>
            <div className="ln-pill-slot">{step >= demo.words.length + 1 ? <span className="ln-pill">{demo.pill}</span> : null}</div>
            <p className="ln-sent">
              {demo.words.map((w, i) => (
                <span key={i}><span className={`ln-w ${i <= Math.min(step, demo.words.length - 1) ? 'on' : ''} ${keysOf(demo).includes(i) && step >= demo.words.length ? 'hl' : ''}`}>{w}</span>{i < demo.words.length - 1 ? ' ' : ''}</span>
              ))}
            </p>
            {step >= demo.words.length + 2 && demo.why ? <p className="ln-why">{demo.why}</p> : null}
          </>
        )}
        {demo.kind === 'pair' && (
          <div className="ln-pair">
            {demo.parts.map((p, pi) => {
              const ls = step - offs[pi];
              if (ls < 0) return null;
              const w = p.words.length;
              return (
                <div key={pi} className="ln-pair-part">
                  <p className="ln-sent">
                    {p.words.map((wd, i) => (
                      <span key={i}><span className={`ln-w ${i <= Math.min(ls, w - 1) ? 'on' : ''} ${keysOf(p).includes(i) && ls >= w ? 'hl' : ''}`}>{wd}</span>{i < w - 1 ? ' ' : ''}</span>
                    ))}
                  </p>
                  <div className="ln-pill-slot-b">{ls >= w + 1 ? <span className="ln-pill">{p.pill}</span> : null}</div>
                </div>
              );
            })}
            {demo.why && step >= last ? <p className="ln-why">{demo.why}</p> : null}
          </div>
        )}
        {demo.kind === 'morph' && (
          <div className="ln-morph">
            {demo.items.map((it, i) => {
              const ph = step - i * 3;
              if (ph < 0) return null;
              return (
                <p key={i} className="ln-mrow">
                  <span>{it.base}</span>
                  {ph >= 1 ? <span className="ln-m-add"> + {it.add}</span> : null}
                  {ph >= 2 ? <><span className="ln-m-arr"> → </span><span className="ln-m-res">{it.result}</span></> : null}
                </p>
              );
            })}
            {demo.why && step >= demo.items.length * 3 ? <p className="ln-why">{demo.why}</p> : null}
          </div>
        )}
        {demo.kind === 'chips' && (
          <>
            <div className="ln-achips">
              {demo.chips.map((c, i) => <span key={i} className={`ln-achip ${i <= step ? 'on' : ''}`}>{c}</span>)}
            </div>
            {demo.why && step >= demo.chips.length ? <p className="ln-why">{demo.why}</p> : null}
          </>
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

/* ---------- Rule body structuring (Variant A layout) ----------
   Splits a rule's book text into lead / label / example chips / pair grid /
   function rows / note WITHOUT dropping a single word - verified token-
   identical against all 13,653 rule bodies. Falls back to a plain
   paragraph whenever no pattern matches. */
function structureBody(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  // --- pair list run: - suffix : word, word ; ... (>=3)
  const itemRe = /[–—-]\s*([a-z][a-z'’]*(?:\s*,\s*-?[a-z][a-z'’]*)*)\s*:\s*([^;]{1,60}?)(?:;|$)/g;
  const pm = [...text.matchAll(itemRe)];
  if (pm.length >= 3 && pm[0].index < 400) {
    const segs = [];
    const start = pm[0].index, end = pm[pm.length - 1].index + pm[pm.length - 1][0].length;
    let before = text.slice(0, start).trim();
    const after = text.slice(end).trim();
    const exTail = before.match(/^(.*?)(যেমন\s*[—–:-])\s*$/);
    let exLabel = '';
    if (exTail) { before = exTail[1].trim(); exLabel = exTail[2].replace(/[—–:-]\s*$/, '').trim(); }
    const mLab = before.match(/^(.*?[।.!?])\s*([^।.!?]{4,80}[:：])\s*$/);
    if (mLab) { segs.push({ t: 'lead', text: mLab[1].trim() }); segs.push({ t: 'label', text: mLab[2].trim() }); }
    else if (before) segs.push({ t: 'lead', text: before });
    if (exLabel) segs.push({ t: 'label', text: exLabel });
    const pairs = pm.map(m => ['-' + m[1].replace(/\s*-/g, '-').trim(), m[2].trim()]);
    segs.push({ t: 'pairs', pairs });
    if (after) segs.push({ t: 'para', text: after.replace(/^[;।\s]+/, '') });
    return segs;
  }
  // --- roman enumerated rows
  const segs = [];
  const rowRe = /(?:^|;\s*|।\s*)((?:i{1,3}|iv|v|vi{0,3}|ix|x)\.\s*[^;:]{2,60}?\s*:\s*[^;]+)/g;
  const rm = [...text.matchAll(rowRe)];
  if (rm.length >= 3) {
    const start = rm[0].index + (rm[0][0].length - rm[0][1].length);
    const end = rm[rm.length - 1].index + rm[rm.length - 1][0].length;
    const before = text.slice(0, start).replace(/[;\s]+$/, '').trim();
    const after = text.slice(end).replace(/^;\s*/, '').trim();
    if (before) segs.push({ t: 'lead', text: before });
    const rows = rm.map(m => {
      const nm = m[1].match(/^((?:i{1,3}|iv|v|vi{0,3}|ix|x))\.\s*(.+)$/);
      const s = nm[2].trim();
      const ci = s.indexOf(' : ');
      return ci > 0 ? [nm[1] + '.', s.slice(0, ci).trim(), s.slice(ci + 3).trim()] : [nm[1] + '.', s, ''];
    });
    segs.push({ t: 'rows', rows });
    if (after) segs.push({ t: 'para', text: after });
    return segs;
  }
  // --- example marker split
  const exRe = /(যেমন\s*[—–:-])|(\bFor example\b\s*[:,]?|\bExamples?\s*:)/;
  const em = text.match(exRe);
  if (em) {
    const before = text.slice(0, em.index).trim();
    let zone = text.slice(em.index + em[0].length).trim();
    if (before) segs.push({ t: 'lead', text: before });
    segs.push({ t: 'label', text: em[0].replace(/[—–:-]\s*$/, '').trim() || 'যেমন' });
    const conc = zone.match(/(সুতরাং|অতএব|কাজেই|So,|Therefore,|Thus,)/);
    let note = '';
    if (conc && conc.index > 20) { note = zone.slice(conc.index).trim(); zone = zone.slice(0, conc.index).trim(); }
    const items = zone.split(';').map(s => s.trim()).filter(Boolean);
    if (items.length >= 2 && items.every(s => s.length <= 90)) segs.push({ t: 'examples', items });
    else if (zone) segs.push({ t: 'exblock', text: zone });
    if (note) segs.push({ t: 'note', text: note });
    return segs;
  }
  segs.push({ t: 'para', text });
  return segs;
}
function splitHeading(h) {
  const s = String(h || '').trim();
  const m = s.match(/^(\d+(?:\.\d+)*\s[A-Za-z]|\d+(?:\.\d+)*(?:\.[A-Za-z])?)\.?\s+(.+)$/);
  if (m && m[2].length >= 2) return { num: m[1].trim(), name: m[2].trim() };
  return { num: '', name: s };
}

function RowExample({ text }) {
  const m = String(text).match(/^([^()]{1,44})\(([^)]*)\)\s*(.*)$/);
  if (!m) return <>{text}</>;
  return <><b>{m[1].trim()}</b> <span className="ln-ftag">({m[2]})</span>{m[3] ? ' ' + m[3] : ''}</>;
}

function RuleBody({ body }) {
  const segs = structureBody(body);
  return (<>
    {segs.map((s, i) => {
      if (s.t === 'lead') return <p key={i} className="ln-lead">{s.text}</p>;
      if (s.t === 'para') return <p key={i} className="ln-rpara">{s.text}</p>;
      if (s.t === 'label') return <div key={i} className="ln-rlabel">{s.text}</div>;
      if (s.t === 'examples') return <div key={i} className="ln-exrow">{s.items.map((x, j) => <span key={j} className="ln-exchip">{x}</span>)}</div>;
      if (s.t === 'exblock') return <div key={i} className="ln-exblock"><p>{s.text}</p></div>;
      if (s.t === 'pairs') return <div key={i} className="ln-pgrid">{s.pairs.map((p, j) => <div key={j} className="ln-pchip"><span className="sfx">{p[0]}</span><span className="arr">{'\u2192'}</span><span className="wd">{p[1]}</span></div>)}</div>;
      if (s.t === 'rows') return <div key={i} className="ln-frows">{s.rows.map((r, j) => <div key={j} className="ln-frow"><span className="ln-fnum">{r[0]}</span><span className="ln-flabel">{r[1]}</span><span className="ln-fex"><RowExample text={r[2]} /></span></div>)}</div>;
      if (s.t === 'note') return <p key={i} className="ln-rnote">{s.text}</p>;
      return null;
    })}
  </>);
}

function RuleCard({ rule, lang, chn, ri }) {
  const heading = lt(rule.heading, lang);
  const body = lt(rule.body, lang);
  const [open, setOpen] = useState(false);
  const demo = useMemo(() => buildDemo(rule, lang, chn, ri), [rule, lang, chn, ri]);
  const hd = splitHeading(heading);
  return (
    <div className="ln-rule">
      {heading ? (
        <div className="ln-rhead">
          {hd.num ? <span className="ln-rnum">{hd.num}</span> : null}
          <h4>{hd.name}</h4>
        </div>
      ) : null}
      <RuleBody body={body} />
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
        <span className="ln-quiz-title">{quiz.mode === 'review' ? 'Review mistakes' : `Chapter ${quiz.chapter} · Practice`}</span>
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
  const [topicPage, setTopicPage] = useState(0); // rules are paged 5 at a time
  const [roundSize, setRoundSize] = useState(10); // questions per practice round: 10 | 20 | 30 | 50 | 'all'

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
    try { setCh(await api(`/api/learning/chapter?n=${n}`)); setTopicPage(0); setRoundSize(10); setScreen('chapter'); } catch (e) { toast(e.message); }
  }
  // Reaching the last group of topics finishes the rules: the old
  // "Mark rules as finished" gate is gone, paging to the end calls the
  // same rules-done API so saved state and stats keep working.
  useEffect(() => {
    if (screen !== 'chapter' || !ch || ch.rulesDone) return;
    const pages = Math.max(1, Math.ceil(ch.rules.length / 5));
    if (topicPage >= pages - 1) markRulesDone();
  }, [screen, ch, topicPage]);
  async function markRulesDone() {
    try {
      await api('/api/learning/rules-done', { method: 'POST', body: { chapter: ch.n } });
      setCh({ ...ch, rulesDone: true });
      loadHome();
    } catch (e) { toast(e.message); }
  }
  // A practice round takes the next `size` questions from where the user
  // left off (the saved answered count, wrapping to the start after the
  // end of the list; a round that runs into the end just has fewer).
  async function startPractice(size) {
    const useSize = size != null ? size : roundSize;
    try {
      const fresh = await api(`/api/learning/chapter?n=${ch.n}`);
      setCh(fresh);
      const total = fresh.practiceTotal || 0;
      if (!total) { toast('No practice questions in this chapter'); return; }
      const from = Number(fresh.answered || 0) % total;
      const count = useSize === 'all' ? total - from : useSize;
      const d = await api(`/api/learning/practice?n=${ch.n}&from=${from}&count=${count}`);
      if (!d.questions.length) { toast('No questions in this round'); return; }
      setQuiz({ mode: 'chapter', chapter: ch.n, size: useSize, questions: d.questions, mistakeQidx: new Set(fresh.mistakeQidx || []) });
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
    setResult({ ...info, mode: doneQuiz.mode, chapter: doneQuiz.chapter, size: doneQuiz.size });
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
              <p>Chapter {result.chapter} · {result.total} questions — your score is saved.</p>
              <div className="ln-result-actions">
                <button type="button" className="btn-accent2" onClick={() => startPractice(result.size)}>Next round</button>
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
    const per = 5;
    const pages = Math.max(1, Math.ceil(ch.rules.length / per));
    const page = Math.min(topicPage, pages - 1);
    const lastGroup = page >= pages - 1;
    const showPractice = ch.rulesDone || lastGroup;
    return (
      <div className="ln-wrap">
        <div className="ln-toprow">
          <button type="button" className="ln-back" onClick={() => setScreen('chapters')}>‹ All chapters</button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        <div className="ln-chhead"><span>Chapter {ch.n}</span><h3>{ch.title}</h3></div>
        <h4 className="ln-sec">Rules</h4>
        <div className="ln-rules">
          {ch.rules.slice(page * per, page * per + per).map((r, k) => <RuleCard key={page * per + k} rule={r} lang={lang} chn={ch.n} ri={page * per + k} />)}
        </div>
        {ch.rulesDone ? (
          <p className="ln-practice-info">{ch.best != null ? `Best ${ch.best}%` : ''}{ch.last != null ? ` · Last ${ch.last}%` : ''}{ch.best != null || ch.last != null ? ' · ' : ''}{fmt(ch.practiceTotal)} questions</p>
        ) : null}
        <div className="ln-topicnav">
          <button type="button" className="btn-soft" disabled={page === 0} onClick={() => setTopicPage(p => Math.max(p - 1, 0))}>Previous topic</button>
          <button type="button" className="btn-soft" disabled={lastGroup} onClick={() => setTopicPage(p => Math.min(p + 1, pages - 1))}>Next topic</button>
          {showPractice ? (
            <>
              <button type="button" className="btn-accent2" onClick={() => startPractice()}>Practice now</button>
              <select className="ln-countsel" aria-label="Questions per round" value={String(roundSize)} onChange={e => setRoundSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                {[10, 20, 30, 50].map(v => <option key={v} value={v}>{v} questions</option>)}
                <option value="all">All questions</option>
              </select>
            </>
          ) : null}
        </div>
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
        {[['1', 'Read the rules', 'Short rule blocks, in the language you like'], ['2', 'Finish the topics', 'Practice opens on the last topic'], ['3', 'Practise & score', 'Pick 10, 20, 30, 50 or all questions · your score is saved']].map(([n, t, s]) => (
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
        {home.scores.length === 0 ? <p className="ln-gnote">No chapter scores yet — finish a practice round and your best scores will show here.</p> : (
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

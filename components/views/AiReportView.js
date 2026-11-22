'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/toast';
import { Ic } from '../icons';

// AI speaking report — a page of its own (the dashboard stays untouched).
// Pro: a fresh report every day; Plus: weekly. Scores come from DeepSeek
// reading the transcript of the user's OWN voice (see lib/aireport.js).
const METRICS = [
  ['fluency', 'Fluency and Coherence'],
  ['lexical', 'Lexical Resource'],
  ['grammar', 'Grammatical Range and Accuracy'],
  ['pronunciation', 'Pronunciation'],
];
function fmtDate(d) {
  if (!d) return '';
  const t = new Date(d);
  return t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function barClass(score) { return score >= 70 ? '' : 'mid'; }

export default function AiReportView({ me, onUpgrade, onOpenSettings }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  async function load(id) {
    try {
      const d = await api('/api/ai/report' + (id ? `?id=${id}` : ''));
      setData(d);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  if (err) return <p className="empty-note">{err}</p>;
  if (!data) return <p className="empty-note">Loading your report…</p>;

  if (!data.eligible) return (
    <div>
      <div className="air-empty card">
        <span className="air-empty-ic"><Ic n="chart" size={22} /></span>
        <h4>AI reports come with Plus and Pro</h4>
        <p>After your calls, AI reviews your own speaking — fluency, vocabulary, grammar and pronunciation — and tells you exactly what to improve.</p>
        <button type="button" className="btn-accent2" onClick={onUpgrade}>See plans</button>
      </div>
    </div>
  );
  if (!data.optin) return (
    <div>
      <div className="air-empty card">
        <span className="air-empty-ic"><Ic n="chart" size={22} /></span>
        <h4>AI reports are switched off</h4>
        <p>Your {data.plan_name} plan includes AI {data.frequency} reports. Turn them on from the Details card on your Profile page — only your own voice is analysed, and only while it is on.</p>
        <button type="button" className="btn-accent2" onClick={onOpenSettings}>Open profile</button>
      </div>
    </div>
  );

  const r = data.report;
  const nameParts = (me?.name || '').trim().split(/\s+/);
  const firstName = nameParts.length > 1 && /^(md|mohammad|mohammed|mst)\.?$/i.test(nameParts[0]) ? nameParts[1] : nameParts[0] || '';
  return (
    <div className="air-wrap">
      <div className="air-meta"><span className="air-badge">{data.plan_name} · <b>{data.frequency === 'weekly' ? 'WEEKLY' : 'DAILY'}</b></span>{r ? <span>{fmtDate(r.report_date)} · from {r.ai_minutes} minute{r.ai_minutes === 1 ? '' : 's'} of your calls</span> : null}</div>

      {!r && (
        <div className="air-empty card">
          <span className="air-empty-ic"><Ic n="chart" size={22} /></span>
          <h4>No report yet</h4>
          <p>Your {data.frequency === 'weekly' ? 'weekly' : 'daily'} report appears here once about 2 minutes of your speaking has been captured from your calls{data.speech_seconds ? ` — so far ${Math.max(1, Math.round(data.speech_seconds / 60))} minute captured this ${data.frequency === 'weekly' ? 'week' : 'day'}` : ''}. Keep practising.</p>
        </div>
      )}

      {r && r.scores && (
        <>
          <div className="air-hero card">
            <div className="air-ring" style={{ background: `conic-gradient(var(--green) 0 ${r.overall}%, #ECECE6 ${r.overall}% 100%)` }}>
              <div className="air-ring-in"><b>{r.overall}%</b><span>OVERALL</span></div>
            </div>
            <div className="air-hero-txt">
              <h4>Good progress{firstName ? `, ${firstName}` : ''}</h4>
              <p>{r.summary}</p>
              <div className="air-chips">
                <span>Fluency {r.scores.fluency.score}%</span><span>Vocabulary {r.scores.lexical.score}%</span><span>Grammar {r.scores.grammar.score}%</span><span>Pronunciation {r.scores.pronunciation.score}%</span>
              </div>
            </div>
          </div>
          <div className="air-grid">
            {METRICS.map(([key, label]) => {
              const m = r.scores[key];
              if (!m) return null;
              return (
                <div className="air-card card" key={key}>
                  <div className="air-mtop"><div className="air-mname">{label} <span>· 25% of score</span></div><div className="air-mpct">{m.score}%</div></div>
                  <div className="air-bar"><i className={barClass(m.score)} style={{ width: `${m.score}%` }}></i></div>
                  <p className="air-note">{m.note}</p>
                  {m.improve?.length ? <div className="air-fix"><b>HOW TO IMPROVE</b><ul>{m.improve.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      {data.history?.length > 1 && (
        <div className="air-hist card">
          <h4>Previous reports</h4>
          {data.history.filter(h => !r || h.id !== r.id).map(h => (
            <button type="button" className="air-hrow" key={h.id} onClick={() => load(h.id)}>
              <span className="air-hd">{new Date(h.report_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="air-track"><i style={{ width: `${h.overall || 0}%` }}></i></span>
              <span className="air-hv">{h.overall}%</span>
              <Ic n="chevD" size={14} />
            </button>
          ))}
        </div>
      )}
      <p className="air-foot">Only your own voice is analysed, and only with your permission (Profile → Details → AI reports). Pronunciation is estimated from speech-recognition clarity — the other three scores come from what you said.</p>
    </div>
  );
}

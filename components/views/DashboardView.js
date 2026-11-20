'use client';
import { useState } from 'react';
import { Ic } from '../icons';
import MiniChart from '../MiniChart';
import { toast } from '@/lib/toast';

const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MOS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIODS = {
  weekly: { btn: 'Weekly', small: 'Last 7 days, day by day', max: 40 },
  monthly: { btn: 'Monthly', small: '', max: 16 },
  yearly: { btn: 'Yearly', small: '', max: 200 },
};
export default function DashboardView({ me, dash, onStartCalling }) {
  const [period, setPeriod] = useState('monthly');
  const [menuOpen, setMenuOpen] = useState(false);
  if (!dash) return <div className="dash-view"><p className="empty-note">Loading…</p></div>;
  const series = dash.series?.[period] || [];
  const labels = series.map(r => r.label);
  const data = series.map(r => Number(r.minutes));
  const total = data.reduce((a, b) => a + b, 0);
  const maxIdx = data.indexOf(Math.max(...data, 0));
  const now = new Date();
  let title, sub;
  if (period === 'weekly') {
    title = 'Your week in minutes';
    sub = `${total} minutes in total this week · best day ${data[maxIdx] || 0} min (${series[maxIdx]?.wd || 'Today'}).`;
  } else if (period === 'monthly') {
    title = `${MO[now.getMonth()]} ${now.getFullYear()} — your month in minutes`;
    sub = `${total} minutes so far this month · best day ${data[maxIdx] || 0} min (${series[maxIdx]?.md || ''}).`;
  } else {
    title = 'Your year in minutes';
    sub = `${total} minutes across ${now.getFullYear()} · ${series[maxIdx]?.label || ''} is already your biggest month.`;
  }
  PERIODS.monthly.small = `${MO[now.getMonth()]} ${now.getFullYear()}, day by day`;
  PERIODS.yearly.small = `${now.getFullYear()}, month by month`;
  const rating = dash.rating != null ? Number(dash.rating) : null;
  const goalPct = Math.min(100, Math.round((dash.today.minutes / 30) * 100));
  function pick(p) { setPeriod(p); setMenuOpen(false); const t = p === 'weekly' ? 'Your week in minutes' : p === 'monthly' ? `${MO[now.getMonth()]} ${now.getFullYear()} — your month in minutes` : 'Your year in minutes'; toast(`Showing your ${PERIODS[p].btn.toLowerCase()} data — ${t}`); }
  return (
    <div className="dash-view">
      <div className="start-card">
        <div><span className="sc-tag"><i></i>{dash.live_now} people online now</span><h4>Start calling</h4></div>
        <button type="button" className="sc-btn" onClick={onStartCalling}><Ic n="phone" />Start calling</button>
      </div>
      <div className="dash-stats">
        <div className="dstat"><b>{dash.today.minutes} min</b><small>talked today</small><div className="dgoal"><i style={{ width: `${goalPct}%` }}></i></div><small>{goalPct}% of your 30-minute daily goal</small></div>
        <div className="dstat"><b>{dash.week_minutes} min</b><small>talked this week</small></div>
        <div className="dstat"><b>{dash.all_minutes} min</b><small>all-time talking · {dash.all_calls} calls</small></div>
        <div className="dstat"><b>{dash.streak} days</b><small>practice streak</small></div>
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="chart-head">
            <div><h4 className="chart-title">{title}</h4><p className="chart-sub">{sub}</p></div>
            <div className={`period-dd ${menuOpen ? 'open' : ''}`}>
              <button type="button" className="period-btn" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><span className="pdot"></span><span className="period-btn-label">{PERIODS[period].btn}</span><svg className="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></button>
              <div className="period-menu" hidden={!menuOpen} role="menu" aria-label="Choose chart period">
                {Object.keys(PERIODS).map(p => (
                  <button type="button" key={p} className={`period-opt ${p === period ? 'on' : ''}`} role="menuitem" onClick={() => pick(p)}><span className="pic">{p === 'weekly' ? 'Wk' : p === 'monthly' ? 'Mo' : 'Yr'}</span><span><b>{PERIODS[p].btn}</b><small>{p === 'weekly' ? 'This week, day by day' : PERIODS[p].small}</small></span><span className="tick">✓</span></button>
                ))}
              </div>
            </div>
          </div>
          {labels.length ? <MiniChart labels={labels} data={data} max={PERIODS[period].max} /> : <p className="empty-note">No calls yet in this period.</p>}
        </div>
        <div className="dash-card"><h4>Your rating</h4>
          {rating != null && dash.rating_cats ? <>
            <div className="drate-head"><b>★ {rating.toFixed(1)}</b><small>from {dash.ratings_count} partner ratings</small></div>
            {[['Fluency', dash.rating_cats.fluency], ['Speaking', dash.rating_cats.speaking], ['Behaviour', dash.rating_cats.behaviour]].map(([label, val]) => (
              <div className="drate-row" key={label}><span>{label}</span><div className="drate-track"><i style={{ width: `${Math.round(Number(val) / 5 * 100)}%` }}></i></div><b>★ {Number(val).toFixed(1)}</b></div>
            ))}
          </> : <p className="empty-note">No ratings yet — ratings come after calls of 5+ minutes.</p>}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { toast } from '@/lib/toast';

const PERIODS = {
  weekly: { btn: 'Weekly', title: 'Your week in minutes', sub: '168 minutes in total this week · best day 36 min (Sat).', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'], data: [18, 26, 12, 30, 22, 36, 24], max: 40, pic: 'Wk', small: 'This week, day by day' },
  monthly: { btn: 'Monthly', title: 'November 2026 — your month in minutes', sub: '184 minutes so far this month · best day 15 min (Nov 20).', labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'], data: [6, 9, 7, 11, 5, 8, 10, 7, 12, 9, 6, 10, 8, 11, 9, 7, 10, 13, 11, 15], max: 16, pic: 'Mo', small: 'November 2026, day by day' },
  yearly: { btn: 'Yearly', title: 'Your year in minutes', sub: '535 minutes across 2026 · November is already your biggest month.', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], data: [22, 28, 31, 27, 35, 33, 41, 38, 44, 52, 184], max: 200, pic: 'Yr', small: '2026, month by month' },
};
function barGrad(c) { const a = c.chart.chartArea; if (!a) return 'rgba(255,77,36,.8)'; const g = c.chart.ctx.createLinearGradient(0, a.bottom, 0, a.top); g.addColorStop(0, 'rgba(14,159,110,.88)'); g.addColorStop(.55, 'rgba(232,147,12,.92)'); g.addColorStop(1, 'rgba(255,77,36,.98)'); return g; }
function fillGrad(c) { const a = c.chart.chartArea; if (!a) return 'rgba(255,77,36,.18)'; const g = c.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, 'rgba(255,77,36,.34)'); g.addColorStop(.55, 'rgba(232,147,12,.14)'); g.addColorStop(1, 'rgba(14,159,110,.03)'); return g; }
function lineGrad(c) { const a = c.chart.chartArea; if (!a) return '#FF4D24'; const g = c.chart.ctx.createLinearGradient(a.left, 0, a.right, 0); g.addColorStop(0, '#0E9F6E'); g.addColorStop(.55, '#E8930C'); g.addColorStop(1, '#FF4D24'); return g; }
function gradDatasets(data) {
  return [
    { type: 'line', label: 'Trend', data: data.slice(), borderColor: lineGrad, backgroundColor: fillGrad, fill: true, tension: .45, borderWidth: 2.5, pointRadius: data.length > 12 ? 0 : 4, pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderColor: '#FF4D24', pointBorderWidth: 2, order: 1 },
    { type: 'bar', label: 'Minutes talked', data: data.slice(), backgroundColor: barGrad, hoverBackgroundColor: 'rgba(255,77,36,.92)', borderRadius: 6, borderSkipped: false, barPercentage: .6, categoryPercentage: .75, order: 2 },
  ];
}
function ShowcaseChart() {
  const [period, setPeriod] = useState('monthly');
  const [open, setOpen] = useState(false);
  const ref = useRef(null); const chartRef = useRef(null);
  const cfg = PERIODS[period];
  useEffect(() => {
    if (!ref.current) return;
    Chart.defaults.font.family = "'Manrope',system-ui,sans-serif";
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current.getContext('2d'), {
      data: { labels: cfg.labels.slice(), datasets: gradDatasets(cfg.data) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#101210', titleFont: { weight: '800' }, bodyFont: { weight: '700' }, padding: 11, cornerRadius: 12, displayColors: false, filter: it => it.dataset.label === 'Minutes talked', callbacks: { title: items => (!items.length ? '' : period === 'monthly' ? `Nov ${items[0].label}, 2026` : items[0].label), label: c => `${c.parsed.y} minutes talked` } } },
        scales: { x: { grid: { display: false }, border: { color: '#E7E7E1' }, ticks: { font: { weight: '700', size: 11 }, color: '#9BA099', maxTicksLimit: 10, autoSkip: true } }, y: { beginAtZero: true, suggestedMax: cfg.max, grid: { color: 'rgba(16,18,16,.06)' }, border: { display: false }, ticks: { font: { weight: '700', size: 11 }, color: '#9BA099', maxTicksLimit: 5 }, title: { display: true, text: 'minutes', font: { weight: '800', size: 11 }, color: '#6E736E' } } } },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [period]);
  return (
    <>
      <div className="chart-head"><div><h4 className="chart-title">{cfg.title}</h4><p className="chart-sub">{cfg.sub}</p></div>
        <div className={`period-dd ${open ? 'open' : ''}`}>
          <button type="button" className="period-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(o => !o)}><span className="pdot"></span><span className="period-btn-label">{cfg.btn}</span><svg className="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg></button>
          <div className="period-menu" hidden={!open} role="menu" aria-label="Choose chart period">
            {Object.entries(PERIODS).map(([key, p]) => (
              <button type="button" key={key} className={`period-opt ${period === key ? 'on' : ''}`} role="menuitem" onClick={() => { setPeriod(key); setOpen(false); toast(`Showing your ${p.btn.toLowerCase()} data — ${p.title}`); }}><span className="pic">{p.pic}</span><span><b>{p.btn}</b><small>{p.small}</small></span><span className="tick">✓</span></button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-wrap"><canvas ref={ref} className="wk-chart" role="img" aria-label="Gradient chart of minutes talked — switchable between weekly, monthly and yearly" /></div>
    </>
  );
}
function FeatChart() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    Chart.defaults.font.family = "'Manrope',system-ui,sans-serif";
    const w = PERIODS.weekly;
    const ch = new Chart(ref.current.getContext('2d'), {
      data: { labels: w.labels.slice(), datasets: gradDatasets(w.data) },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#101210', titleFont: { weight: '800' }, bodyFont: { weight: '700' }, padding: 11, cornerRadius: 12, displayColors: false, filter: it => it.dataset.label === 'Minutes talked', callbacks: { label: c => `${c.parsed.y} minutes talked` } } },
        scales: { x: { grid: { display: false }, border: { color: '#E7E7E1' }, ticks: { font: { weight: '700', size: 10 }, color: '#9BA099' } }, y: { beginAtZero: true, suggestedMax: w.max, grid: { color: 'rgba(16,18,16,.05)' }, border: { display: false }, ticks: { display: false } } } },
    });
    return () => ch.destroy();
  }, []);
  return <div className="lp-feat-chart"><canvas ref={ref} className="lp-chart" role="img" aria-label="Gradient Chart.js chart of minutes talked this week" /></div>;
}

export default function LandingPage() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = root.querySelectorAll('.lp-reveal,.lp-sec-line');
    if (reduced || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .04, rootMargin: '0px 0px 8% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <section className="page on" id="page-landing" ref={rootRef}><div className="page-in">

  <nav className="lp-nav" aria-label="Landing page">
    <span className="lp-logo">talk<i>.</i></span>
    <a className="lp-link" href="#lp-features">Features</a>
    <a className="lp-link" href="#lp-how">How it works</a>
    <a className="lp-link" href="#lp-pricing">Pricing</a>
    <a className="lp-link" href="#lp-ai">AI reports</a>
    <a className="lp-link" href="#lp-faq">FAQ</a>
    <a className="lp-login" href="/login" style={{ textDecoration: 'none' }}>Log in</a>
    <a className="lp-cta" href="/register" style={{ textDecoration: 'none' }}>Create free account</a>
  </nav>

  
  <div className="lp-hero">
    <div className="lp-hero-top"><span>Live English practice — Dhaka → the world</span><span className="live-now"><i></i>128 practising right now</span></div>
    <h1>Speak English.<br/><span className="serif">Out loud.</span> <span className="sweep">Every day.</span></h1>
    <div className="lp-hero-grid">
      <div className="lp-reveal in">
        <p className="lp-lede">Live voice calls with <b>real people</b>.<br/>Matched in <b>seconds</b>.</p>
        <div className="lp-ctas">
          <a className="lp-btn acc" href="/register" style={{ textDecoration: 'none' }}>Start free — no card needed</a>
          <a className="lp-btn dark" href="/app" style={{ textDecoration: 'none' }}>Open the app →</a>
          <a className="lp-btn ghost" href="#lp-pricing" style={{ textDecoration: 'none' }}>See fair pricing</a>
        </div>
        <div className="lp-fair-strip" aria-label="Prices at a glance">
          <span>Free · <b><span className="taka">৳</span>0 · 15 min / day</b></span>
          <span>Plus · <b><span className="taka">৳</span>100 / month · unlimited</b></span>
          <span>Pro · <b><span className="taka">৳</span>150 / month · unlimited</b></span>
        </div>
        
      </div>
      <div className="lp-stats" style={{ marginTop: '0' }}>
        <div><b>2,431</b><small>learners practising on Talk</small></div>
        <div><b>10,952</b><small>minutes talked in the last 7 days</small></div>
      </div>
    </div>

    
    <div className="lp-show">
      <div className="lp-app">
        <div className="browser-bar"><i style={{ background: '#FF5F57' }}></i><i style={{ background: '#FEBC2E' }}></i><i style={{ background: '#28C840' }}></i><span className="browser-url">talk.bangonix.app</span><button className="bell-btn js-bell" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false"><span className="ic"><svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg></span><span className="bell-badge">3</span></button><button className="me js-my-avatar js-profile-trigger" type="button" title="Profile menu" aria-haspopup="menu" aria-expanded="false"><img src="/assets/faces/zahid.jpg" alt=""/></button></div>
        <div className="desk-app">
          <aside className="sidebar">
            <div className="logo">talk<i>.</i></div>
            <nav className="nav">
              <a className="act js-open-home"><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8.5A1.5 1.5 0 0 1 18.5 21h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19.5Z"/></svg></span>Dashboard</a>
              <a className="js-open-rooms"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M3 21h18"/><path d="M15.5 12h.01" strokeWidth="2.8"/></svg></span>Room</a>
              <a className="js-open-people"><span className="ic"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.2a3.5 3.5 0 0 1 0 5.9M17.8 14.9c1.5.7 2.4 2.2 2.7 4.1"/></svg></span>People</a>
              <a className="js-open-create"><span className="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/></svg></span>Create room</a>
              <a className="js-open-chat"><span className="ic"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5Z"/></svg></span>Chats</a>
              <a className="js-open-profile"><span className="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg></span>Profile</a>
              <a className="js-open-subscription"><span className="ic"><svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg></span>Subscription<span className="sub-nav-badge js-sub-badge">Free</span></a>
              <a className="js-open-support"><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><rect x="2.5" y="13" width="4.5" height="6" rx="2"/><rect x="17" y="13" width="4.5" height="6" rx="2"/><path d="M19.5 19.5c0 1.2-1 2-2.5 2H13"/></svg></span>Support<span className="sub-nav-badge" style={{ background: '#FFF4D6', color: '#7A5A00' }}>2 open</span></a>
            </nav>
            <div className="side-label">Friends online</div>
            <div className="online-mini lp-online-mini">
              <a data-name="Tania Islam"><span className="av-wrap"><span className="avatar" style={{ background: '#0E9594' }}><img src="/assets/faces/tania.jpg" alt=""/></span><i className="presence" title="Online"></i></span><span><b>Tania Islam</b><small>Online</small></span><span className="call-ic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg></span></span></a>
              <a data-name="Rahim Ahmed"><span className="av-wrap"><span className="avatar" style={{ background: '#E4572E' }}><img src="/assets/faces/rahim.jpg" alt=""/></span><i className="presence" title="Online"></i></span><span><b>Rahim Ahmed</b><small>Online</small></span><span className="call-ic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg></span></span></a>
            </div>
          </aside>
          <div className="center">
            <div className="center-top"><div><div className="hi js-greeting">Good evening, Zahid</div><h3>Ready to practise?</h3></div><span className="live-pill"><i></i><span className="js-live-count">128 live now</span></span></div>
            <div className="dash-view"><div className="start-card"><div><span className="sc-tag"><i></i>128 people online now</span><h4>Start calling</h4></div><a className="sc-btn" href="/app" style={{ textDecoration: 'none' }}><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg></span>Start calling</a></div><div className="dash-stats"><div className="dstat"><b>24 min</b><small>talked today</small><div className="dgoal"><i style={{ width: '80%' }}></i></div><small>80% of your 30-minute daily goal</small></div><div className="dstat"><b>168 min</b><small>talked this week</small></div><div className="dstat"><b>342 min</b><small>all-time talking · 26 calls</small></div><div className="dstat"><b>9 days</b><small>practice streak</small></div></div><div className="dash-grid"><div className="dash-card"><ShowcaseChart/></div><div className="dash-card"><h4>Your rating</h4><div className="drate-head"><b>★ 4.6</b><small>from 19 partner ratings</small></div><div className="drate-row"><span>Fluency</span><div className="drate-track"><i style={{ width: '90%' }}></i></div><b>★ 4.5</b></div><div className="drate-row"><span>Speaking</span><div className="drate-track"><i style={{ width: '88%' }}></i></div><b>★ 4.4</b></div><div className="drate-row"><span>Behaviour</span><div className="drate-track"><i style={{ width: '96%' }}></i></div><b>★ 4.8</b></div></div></div></div>
          </div>
        </div>
      </div>
      <div className="lp-matchtoast"><span className="avatar"><img src="/assets/faces/sadia.jpg" alt=""/></span><span><b>Matched in 3 seconds</b><small>Sadia R. · Dhaka · Online now</small></span></div>
      <div className="lp-callfloat" aria-label="A live call on Talk">
        <div className="top"><span className="live">● LIVE CALL</span><span className="enc">🔒 End-to-end encrypted</span></div>
        <div className="who"><span className="avatar"><img src="/assets/faces/tania.jpg" alt=""/></span><span><b>Tania Islam</b><small>IELTS practice · Speaking now</small></span><span className="timer">06:24</span></div>
        <div className="lp-wave" data-spikes="96" data-seed="11" role="img" aria-label="Voice waveform of the live call"><i style={{ height: '22%' }}></i><i style={{ height: '46%' }}></i><i style={{ height: '33%' }}></i><i style={{ height: '42%' }}></i><i style={{ height: '50%' }}></i><i style={{ height: '20%' }}></i><i style={{ height: '37%' }}></i><i style={{ height: '34%' }}></i><i style={{ height: '32%' }}></i><i style={{ height: '10%' }}></i><i style={{ height: '28%' }}></i><i style={{ height: '15%' }}></i><i style={{ height: '80%' }}></i><i style={{ height: '67%' }}></i><i style={{ height: '10%' }}></i><i style={{ height: '66%' }}></i><i style={{ height: '47%' }}></i><i style={{ height: '27%' }}></i><i style={{ height: '35%' }}></i><i style={{ height: '14%' }}></i><i style={{ height: '6%' }}></i><i style={{ height: '31%' }}></i><i style={{ height: '6%' }}></i><i style={{ height: '12%' }}></i><i style={{ height: '19%' }}></i><i style={{ height: '8%' }}></i><i style={{ height: '43%' }}></i><i style={{ height: '41%' }}></i><i style={{ height: '66%' }}></i><i style={{ height: '35%' }}></i><i style={{ height: '29%' }}></i><i style={{ height: '26%' }}></i><i style={{ height: '47%' }}></i><i style={{ height: '42%' }}></i><i style={{ height: '31%' }}></i><i style={{ height: '93%' }}></i><i style={{ height: '86%' }}></i><i style={{ height: '62%' }}></i><i style={{ height: '40%' }}></i><i style={{ height: '14%' }}></i><i style={{ height: '14%' }}></i><i style={{ height: '20%' }}></i><i style={{ height: '9%' }}></i><i style={{ height: '44%' }}></i></div>
        <div className="lp-callbtns" role="img" aria-label="Call controls">
          <span className="cc-btn" title="Mic" aria-hidden="true"><span className="ic"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg></span></span>
          <span className="cc-btn" title="Speaker" aria-hidden="true"><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 10v4h3l5 4V6l-5 4H4Z"/><path d="M15.5 9.5a4 4 0 0 1 0 5M18.2 7a7.6 7.6 0 0 1 0 10"/></svg></span></span>
          <button type="button" className="cc-btn cc-video lp-video-btn" title="Turn camera on" aria-label="Turn camera on"><span className="ic"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.8 21.5 7.2v9.6l-6-3.6"/></svg></span></button>
          <span className="cc-btn" title="Add people" aria-hidden="true"><span className="ic"><svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M4 19.5c.5-3 2.6-4.7 6-4.7 1 0 1.9.2 2.7.5M18 8v6M15 11h6"/></svg></span></span>
          <span className="cc-btn" title="Minimise" aria-hidden="true"><span className="ic"><svg viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></svg></span></span>
          <span className="cc-end" title="End call" aria-hidden="true"><span className="ic"><svg viewBox="0 0 24 24"><g transform="rotate(135 12 12)"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></g></svg></span></span>
        </div>
        
      </div>
    </div>

    <div className="lp-ticker" aria-hidden="true"><div className="lp-ticker-track"><span>IELTS Speaking <i>✦</i></span><span>Debate Prep <i>✦</i></span><span>Job Interviews <i>✦</i></span><span>Daily English <i>✦</i></span><span>Presentations <i>✦</i></span><span>Small Talk <i>✦</i></span><span>Travel English <i>✦</i></span><span>IELTS Speaking <i>✦</i></span><span>Debate Prep <i>✦</i></span><span>Job Interviews <i>✦</i></span><span>Daily English <i>✦</i></span><span>Presentations <i>✦</i></span><span>Small Talk <i>✦</i></span><span>Travel English <i>✦</i></span></div></div>

    <div className="lp-stats lp-reveal">
      <div><b>15 <span className="serif">min</span></b><small>Free calling · every day</small></div>
      <div><b>5 <span className="serif">min</span></b><small>Minimum for ratings</small></div>
      <div><b><span className="taka">৳</span>100</b><small>Plus — unlimited calls, per month</small></div>
      <div><b>Audio + <span className="serif">video</span></b><small>Video calls · included</small></div>
    </div>
  </div>

  
  <div className="lp-sec" id="lp-features">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 01</span><h2>Everything, <span className="serif">visible.</span></h2></div>
    <div className="lp-sec-line"></div>

    <div className="lp-showcase lp-reveal">
      <div className="lp-ftext">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg></span></span>
        <h3>Start Calling — random 1-to-1 calls</h3>
        
        <span><span className="lp-plan-note">Free: 15 min / day</span><span className="lp-plan-note paid">Paid: unlimited</span></span>
      </div>
      <div className="lp-visual">
        <h5>Matching — right now</h5>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#E8930C' }}><img src="/assets/faces/zahid.jpg" alt=""/></span><span>You<small>Dhaka · looking now</small></span><span className="r">Searching…</span></div>
        <div className="lp-wave" data-spikes="110" data-seed="29" role="img" aria-label="Voice waveform while matching"><i style={{ height: '15%' }}></i><i style={{ height: '45%' }}></i><i style={{ height: '21%' }}></i><i style={{ height: '35%' }}></i><i style={{ height: '23%' }}></i><i style={{ height: '22%' }}></i><i style={{ height: '39%' }}></i><i style={{ height: '10%' }}></i><i style={{ height: '38%' }}></i><i style={{ height: '26%' }}></i><i style={{ height: '39%' }}></i><i style={{ height: '97%' }}></i><i style={{ height: '34%' }}></i><i style={{ height: '46%' }}></i><i style={{ height: '24%' }}></i><i style={{ height: '29%' }}></i><i style={{ height: '28%' }}></i><i style={{ height: '17%' }}></i><i style={{ height: '37%' }}></i><i style={{ height: '34%' }}></i><i style={{ height: '54%' }}></i><i style={{ height: '31%' }}></i><i style={{ height: '9%' }}></i><i style={{ height: '35%' }}></i><i style={{ height: '22%' }}></i><i style={{ height: '37%' }}></i><i style={{ height: '18%' }}></i><i style={{ height: '25%' }}></i><i style={{ height: '32%' }}></i><i style={{ height: '27%' }}></i><i style={{ height: '53%' }}></i><i style={{ height: '66%' }}></i><i style={{ height: '60%' }}></i><i style={{ height: '67%' }}></i><i style={{ height: '42%' }}></i><i style={{ height: '53%' }}></i><i style={{ height: '51%' }}></i><i style={{ height: '8%' }}></i><i style={{ height: '43%' }}></i><i style={{ height: '26%' }}></i></div>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#0E9594' }}><img src="/assets/faces/tania.jpg" alt=""/></span><span>Tania Islam<small>IELTS · speaking partner</small></span><span className="r grn">Matched ✓</span></div>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#3A7CA5' }}><img src="/assets/faces/sadia.jpg" alt=""/></span><span>Sadia Rahman<small>Small talk · online</small></span><span className="r grn">● Online</span></div>
      </div>
    </div>

    <div className="lp-showcase flip lp-reveal">
      <div className="lp-ftext">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M3 21h18"/></svg></span></span>
        <h3>Speaking rooms — public &amp; private</h3>
        
        <span><span className="lp-plan-note">Join public: Free</span><span className="lp-plan-note paid">Create private: Plus &amp; Pro</span></span>
      </div>
      <div className="lp-visual light">
        <h5>Live rooms</h5>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#E4572E' }}><img src="/assets/faces/rahim.jpg" alt=""/></span><span>Daily English — Your Day<small>24 speaking</small></span><span className="lp-vis-badge">Public</span><span className="r">Join →</span></div>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#7FB069' }}><img src="/assets/faces/arif.jpg" alt=""/></span><span>IELTS Speaking — Part 2<small>8 speaking</small></span><span className="lp-vis-badge">Public</span><span className="r">Join →</span></div>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#B45309' }}><img src="/assets/faces/nusrat.jpg" alt=""/></span><span>Job Interview Practice<small>6 speaking</small></span><span className="lp-vis-badge">Public</span><span className="r">Join →</span></div>
        <div className="lp-vrow"><span className="avatar" style={{ background: '#46536A' }}><img src="/assets/faces/imran.jpg" alt=""/></span><span>Debate Prep — Evening<small>12 speaking</small></span><span className="lp-vis-badge priv" style={{ display: 'inline-flex', alignItems: 'center' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ width: '11px', height: '11px', marginRight: '4px', flex: '0 0 auto' }}><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>Private</span><span className="r">Password</span></div>
      </div>
    </div>

    <div className="lp-showcase lp-reveal">
      <div className="lp-ftext">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5Z"/></svg></span></span>
        <h3>Chats — encrypted, with photos</h3>
        
        <span><span className="lp-plan-note">Included on every plan</span></span>
      </div>
      <div className="lp-visual light">
        <h5>Chat — Tania Islam · Online</h5>
        <div className="lp-bubble lt">Hi! Ready for Part 2 practice? 🎙</div>
        <div className="lp-bubble lt me">Yes — give me a topic card.</div>
        <div className="lp-bubble lt">📷 Photo</div>
        <div className="lp-bubble lt me">Got it. See you at 7pm 👍</div>
        <span className="lp-nudgepill">🔒 End-to-end encrypted</span>
      </div>
    </div>

    <div className="lp-feats">
      <div className="lp-feat lp-reveal">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.2a3.5 3.5 0 0 1 0 5.9M17.8 14.9c1.5.7 2.4 2.2 2.7 4.1"/></svg></span></span>
        <h3>People — partners you keep</h3>
        
        <div className="lp-visual light">
          <div className="lp-vrow"><span className="avatar" style={{ background: '#0E9594' }}><img src="/assets/faces/tania.jpg" alt=""/></span><span>Tania Islam<small>IELTS</small></span><span className="r grn">● Online</span><span className="r">Call</span></div>
          <div className="lp-vrow"><span className="avatar" style={{ background: '#E4572E' }}><img src="/assets/faces/rahim.jpg" alt=""/></span><span>Rahim Ahmed<small>Daily English</small></span><span className="r grn">● Online</span><span className="r">Chat</span></div>
          <div className="lp-vrow" style={{ opacity: '.55' }}><span className="avatar" style={{ background: '#8A8578' }}>??</span><span>Blocked person<small>Blocked</small></span><span className="r">Unblock</span></div>
        </div>
        <span className="lp-plan-note">Included on every plan</span>
      </div>

      <div className="lp-feat lp-reveal d1">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></svg></span></span>
        <h3>Dashboard — see yourself improve</h3>
        
        <div className="lp-visual light">
          <FeatChart/>
          <div className="lp-statrow"><div><b>24 min</b><small>today</small></div><div><b>342 min</b><small>all time</small></div><div><b>9 days</b><small>streak</small></div></div>
        </div>
        <span><span className="lp-plan-note">Basic stats: Free</span><span className="lp-plan-note paid">Full charts: Plus &amp; Pro</span></span>
      </div>

      <div className="lp-feat lp-reveal">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M12 3.5 13.8 8.7 19.3 10.5 13.8 12.3 12 17.5 10.2 12.3 4.7 10.5 10.2 8.7Z"/></svg></span></span>
        <h3>Partner ratings — fair, after real calls</h3>
        
        <div className="lp-visual light">
          <div className="lp-vrow"><span>Fluency</span><span className="r"><span className="lp-stars">★★★★★</span></span></div>
          <div className="lp-vrow"><span>Speaking</span><span className="r"><span className="lp-stars">★★★★☆</span></span></div>
          <div className="lp-vrow"><span>Behaviour</span><span className="r"><span className="lp-stars">★★★★★</span></span></div>
        </div>
        <span className="lp-plan-note">Included on every plan</span>
      </div>

      <div className="lp-feat lp-reveal d1">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span></span>
        <h3>Private by design</h3>
        
        <div className="lp-visual">
          <div className="lp-vrow"><span>You</span><span style={{ flex: '1', textAlign: 'center', opacity: '.65' }}>— — 🔒 encrypted — —</span><span>Partner</span></div>
          <div className="lp-vrow"><span>Admin sees</span><span className="r">Minutes only</span></div>
          <div className="lp-vrow"><span>Admin never sees</span><span className="r grn">Your words</span></div>
        </div>
        <span className="lp-plan-note">Included on every plan</span>
      </div>

      <div className="lp-feat lp-reveal">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"/></svg></span></span>
        <h3>A gentle nudge to stay in English</h3>
        
        <div className="lp-visual light">
          <div className="lp-bubble lt me">…ami kal try korbo…</div>
          <span className="lp-nudgepill">💬 Talk in English. It will help you. <span style={{ opacity: '.6' }}>Dismiss ✕</span></span>
        </div>
        <span className="lp-plan-note">Included on every plan</span>
      </div>

      <div className="lp-feat lp-reveal d1">
        <span className="fic"><span className="ic"><svg viewBox="0 0 24 24"><path d="M5 21V4h11l-2 4 2 4H5"/></svg></span></span>
        <h3>Report &amp; block — you stay in control</h3>
        
        <div className="lp-visual light">
          <div className="lp-vrow"><span>🚫 Block</span><span className="r">Contact stops instantly</span></div>
          <div className="lp-vrow"><span>🚩 Report</span><span className="r">Admin reviews · can ban</span></div>
          <div className="lp-vrow"><span>🎫 Support ticket</span><span className="r grn">“Taken care of” ✓</span></div>
        </div>
        <span className="lp-plan-note">Included on every plan</span>
      </div>
    </div>
  </div>

  
  <div className="lp-sec" id="lp-how">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 02</span><h2>Tap. Talk. <span className="serif">Grow.</span></h2></div>
    <div className="lp-sec-line"></div>
    <div className="lp-steps">
      <div className="lp-step lp-reveal"><span className="n">01</span><b>Create your free account</b></div>
      <div className="lp-step lp-reveal"><span className="n">02</span><b>Land on your Dashboard</b></div>
      <div className="lp-step acc lp-reveal"><span className="n">03</span><b>Start Calling — get matched</b></div>
      <div className="lp-step lp-reveal"><span className="n">04</span><b>Or join a room</b></div>
      <div className="lp-step lp-reveal"><span className="n">05</span><b>Talk — the call floats</b></div>
      <div className="lp-step lp-reveal"><span className="n">06</span><b>Connect &amp; rate</b></div>
      <div className="lp-step lp-reveal"><span className="n">07</span><b>Watch progress grow</b></div>
      <div className="lp-step acc lp-reveal"><span className="n">08</span><b>Go unlimited</b></div>
    </div>
  </div>

  
  <div className="lp-sec" id="lp-pricing">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 03</span><h2>Fair prices. <span className="serif">In taka.</span></h2></div>
    <div className="lp-sec-line"></div>
    <div className="sub-grid lp-reveal">
      <div className="sub-card" data-plan="free">
        <div className="sub-card-top"><span className="sub-plan">Free</span><span className="sub-tag cur">Start here</span></div>
        <div className="sub-price"><b><span className="taka">৳</span>0</b><small>free for now</small></div>
        <span className="sub-for">Best for trying Talk</span>
        
        <ul className="sub-feats">
          <li>15 minutes of calls per day</li>
          <li>Join public rooms</li>
          <li>Encrypted calls &amp; chats</li>
          <li>Ratings after 5+ minute calls</li>
          <li className="no">Unlimited calls</li>
          <li className="no">Private rooms with a password</li>
          <li className="no">AI reports</li>
        </ul>
        <a className="sub-choose" href="/register?plan=free" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Start on Free</a>
      </div>
      <div className="sub-card" data-plan="plus">
        <div className="sub-card-top"><span className="sub-plan">Plus</span><span className="sub-tag pop">Most popular</span></div>
        <div className="sub-price"><b><span className="taka">৳</span>100</b><small>/ month</small></div>
        <span className="sub-for">Best for daily practice</span>
        
        <ul className="sub-feats">
          <li>Unlimited calls — no daily limit</li>
          <li>Priority matching by gender</li>
          <li>Private rooms with a password</li>
          <li>Full stats, charts &amp; history</li>
          <li>AI weekly reports</li>
          <li>Everything in Free</li>
          <li className="no">AI daily reports — Pro only</li>
          <li className="no">Native-speaker priority</li>
        </ul>
        <a className="sub-choose" href="/register?plan=plus" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Choose Plus — <span className="taka">৳</span>100/month</a>
      </div>
      <div className="sub-card" data-plan="pro">
        <div className="sub-card-top"><span className="sub-plan">Pro</span><span className="sub-tag">Most features</span></div>
        <div className="sub-price"><b><span className="taka">৳</span>150</b><small>/ month</small></div>
        <span className="sub-for">Best for serious learners</span>
        
        <ul className="sub-feats">
          <li>Everything in Plus</li>
          <li>Native-speaker priority in matching</li>
          <li>Priority support</li>
          <li>AI daily reports</li>
        </ul>
        <a className="sub-choose" href="/register?plan=pro" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Choose Pro — <span className="taka">৳</span>150/month</a>
      </div>
    </div>

    <div className="lp-tablewrap lp-reveal">
      <table className="lp-table" aria-label="Plan comparison">
        <thead><tr><th>Compare at a glance</th><th>Free<small><span className="taka">৳</span>0 · free for now</small></th><th>Plus<small><span className="taka">৳</span>100 / month</small></th><th>Pro<small><span className="taka">৳</span>150 / month</small></th></tr></thead>
        <tbody>
          <tr><td>Random calls</td><td>15 min / day</td><td className="yes">Unlimited</td><td className="yes">Unlimited</td></tr>
          <tr><td>Join public rooms</td><td className="yes">✓ Yes</td><td className="yes">✓ Yes</td><td className="yes">✓ Yes</td></tr>
          <tr><td>Create private rooms</td><td className="no">— No</td><td className="yes">✓ Yes</td><td className="yes">✓ Yes</td></tr>
          <tr><td>Matching</td><td>Standard</td><td>Priority</td><td>Priority + native first</td></tr>
          <tr><td>Stats &amp; history</td><td>Basic</td><td className="yes">Full</td><td className="yes">Full</td></tr>
          <tr><td>Ratings (5+ min calls)</td><td className="yes">✓ Yes</td><td className="yes">✓ Yes</td><td className="yes">✓ Yes</td></tr>
          <tr><td>Support</td><td>Standard</td><td>Standard</td><td>Priority</td></tr>
          <tr><td>AI reports</td><td className="no">— No</td><td className="yes">Weekly</td><td className="yes">Daily</td></tr>
        </tbody>
      </table>
    </div>

    
  </div>

  
  <div className="lp-sec" id="lp-ai">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 04</span><h2>AI reports. <span className="serif">Your call.</span></h2></div>
    <div className="lp-sec-line"></div>
    <div className="lp-reportmock lp-reveal">
      <div><h3>Weekly on Plus.<br/>Daily on Pro.</h3></div>
      <div className="lp-reportcard">
        <div className="rh"><b>Today's AI report</b><span>AI REPORTS</span></div>
        <div className="lp-meterrow"><span style={{ width: '92px' }}>Fluency</span><span className="tr"><i style={{ width: '78%' }}></i></span><b>78</b></div>
        <div className="lp-meterrow"><span style={{ width: '92px' }}>Grammar</span><span className="tr"><i style={{ width: '56%' }}></i></span><b>3 fixes</b></div>
        <div className="lp-meterrow"><span style={{ width: '92px' }}>Vocabulary</span><span className="tr"><i style={{ width: '72%' }}></i></span><b>+12 words</b></div>
        <p style={{ fontSize: '12px', color: '#8A8578', fontWeight: '700', marginTop: '12px' }}>Tomorrow's focus: past-tense endings · linking words · stress on long words.</p>
      </div>
    </div>
    <div className="lp-two">
      <div className="lp-panel lp-reveal">
        <h4>What you get</h4>
        <ul>
          <li><b>Fluency</b> — how smoothly you spoke</li>
          <li><b>Grammar</b> — real mistakes, and the fix</li>
          <li><b>Vocabulary</b> — richer words to try</li>
          <li><b>Improvements</b> — what helps most next</li>
        </ul>
      </div>
      <div className="lp-panel lp-reveal d1">
        <h4>The rules — always your choice</h4>
        <ul>
          <li><b>Opt-in only</b> — asked once, on your first premium call</li>
          <li><b>Off anytime</b> — Profile → Settings → Preferences</li>
          <li><b>Your voice only</b> — never your partner's</li>
          <li><b>Fair limit</b> — 30 AI minutes/day, shared fairly. Calls never cut.</li>
          <li><b>Included in Plus &amp; Pro</b> — weekly on Plus, daily on Pro</li>
        </ul>
      </div>
    </div>
  </div>

  
  <div className="lp-sec" id="lp-safety">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 05</span><h2>Safety &amp; privacy, <span className="serif">in plain words.</span></h2></div>
    <div className="lp-sec-line"></div>
    <div className="lp-two">
      <div className="lp-panel lp-reveal">
        <h4>Your conversations stay yours</h4>
        <ul>
          <li>End-to-end encrypted calls &amp; chats</li>
          <li>Photos phone-to-phone only — never stored</li>
          <li>People list private — call + accepted request first</li>
          <li>Admin sees numbers — never content</li>
        </ul>
      </div>
      <div className="lp-panel lp-reveal d1">
        <h4>If something goes wrong</h4>
        <ul>
          <li><b>Block</b> — their calls stop, instantly</li>
          <li><b>Report</b> — admin reviews; can ban platform-wide</li>
          <li><b>Support tickets</b> — replies right on your ticket</li>
          <li><b>Notifications</b> — messages &amp; missed calls, by your profile</li>
        </ul>
      </div>
    </div>
  </div>

  
  <div className="lp-sec" id="lp-faq">
    <div className="lp-sec-head lp-reveal"><span className="lp-sec-idx">/ 06</span><h2>Questions, <span className="serif">answered straight.</span></h2></div>
    <div className="lp-sec-line"></div>
    <div className="lp-faq lp-reveal">
      <details><summary>Is Talk really free?</summary><p>Yes — 15 minutes of calling every day, free. Free is not forever, and if that ever changes you will be told here first.</p></details>
      <details><summary>What exactly do I get after paying?</summary><p>Unlimited calls with no daily limit, private rooms with a password, and full stats and charts.</p></details>
      <details><summary>What happens when my free 15 minutes run out?</summary><p>You can keep chatting and browsing; calling opens again tomorrow, or right away on a paid plan.</p></details>
      <details><summary>How do I pay, and can I cancel?</summary><p>Pay manually with bKash or Nagad inside the app — send money, submit your number and TrxID, and your plan activates when confirmed. Switch or cancel anytime.</p></details>
      <details><summary>Is it audio or video?</summary><p>Both — audio and video calls are included on every plan.</p></details>
      <details><summary>Are my calls recorded or listened to?</summary><p>No. Calls and chats are end-to-end encrypted; the admin sees numbers like minutes and user counts — never your words.</p></details>
      <details><summary>Who is Talk for?</summary><p>Anyone who wants to practise spoken English out loud, every day — especially university students.</p></details>
    </div>
  </div>

  <div className="lp-final lp-reveal">
    <h2>Your first 15 minutes are <span className="serif">free today.</span></h2>
    
    <div className="lp-ctas">
      <a className="lp-btn acc" href="/register" style={{ textDecoration: 'none' }}>Create free account</a>
      <a className="lp-btn ghost" href="/app" style={{ textDecoration: 'none' }}>Explore the app first →</a>
    </div>
  </div>

  <div className="lp-foot">
    <span>talk. · talk.bangonix.app — live English speaking practice</span>
    <span><a href="/login" style={{ fontWeight: '800', color: 'var(--ink)', textDecoration: 'none' }}>Log in</a> · <a href="/register" style={{ fontWeight: '800', color: 'var(--ink)', textDecoration: 'none' }}>Register</a> · <a href="/app" style={{ fontWeight: '800', color: 'var(--ink)', textDecoration: 'none' }}>Open the app</a></span>
  </div>
    </div></section>
  );
}

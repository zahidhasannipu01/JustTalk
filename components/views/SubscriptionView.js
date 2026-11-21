'use client';
import { useState } from 'react';
import Overlay from '../Overlay';
import { api, toast, Taka } from '@/lib/toast';

const METHODS = [
  { id: 'bkash', name: 'bKash', logo: '/assets/bkash-logo.png' },
  { id: 'nagad', name: 'Nagad', logo: '/assets/nagad-logo.png' },
];
function PayDD({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = METHODS.find(m => m.id === value);
  return (
    <div className={`paydd ${open ? 'open' : ''}`}>
      <button type="button" className="paydd-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <img className="paydd-logo" src={cur.logo} alt="" /><span>{cur.name}</span>
        <span className="paydd-chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></span>
      </button>
      <div className="paydd-menu" hidden={!open} role="listbox">
        {METHODS.map(m => (
          <button type="button" key={m.id} className="paydd-opt" role="option" aria-selected={m.id === value} onClick={() => { onChange(m.id); setOpen(false); }}>
            <img className="paydd-logo" src={m.logo} alt="" /><span><b>{m.name}</b></span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionView({ data, reload, preselect }) {
  const [selected, setSelected] = useState(preselect || null);
  const [payFor, setPayFor] = useState(null);
  if (!data) return <div className="subscriptionview"><p className="empty-note">Loading…</p></div>;
  const { packages, subscription, pending_payment } = data;
  const currentId = subscription?.package_id;
  const curPkg = packages.find(p => p.id === currentId);
  return (
    <div className="subscriptionview">
      <div className="sub-head"><h3>Subscription</h3></div>
      <div className="sub-current">
        <div className="sub-current-main"><span className="sub-active"><i></i>{pending_payment ? 'Waiting for confirmation' : 'Subscribed'}</span><b className="sub-cur-title">You’re subscribed — {subscription?.plan_name || 'Free'} plan</b></div>
        <div className="sub-cur-price"><b className="sub-cur-price-b"><Taka>৳</Taka>{curPkg?.price_taka ?? 0}</b><small className="sub-cur-price-s">current plan</small></div>
      </div>
      <div className="sub-grid">
        {packages.map(p => {
          const isCurrent = p.id === currentId; const isSel = selected === p.id || (!selected && isCurrent);
          const feats = (p.included || '').split('\n').filter(Boolean); const notFeats = (p.not_included || '').split('\n').filter(Boolean);
          const isPending = pending_payment && pending_payment.package_id === p.id;
          return (
            <div className={`sub-card ${isSel ? 'selected' : ''}`} key={p.id} onClick={() => setSelected(p.id)}>
              <div className="sub-card-top"><span className="sub-plan">{p.name}</span>{isCurrent ? <span className="sub-tag cur">Current plan</span> : p.tag ? <span className={`sub-tag ${p.tag === 'Most popular' ? 'pop' : ''}`}>{p.tag}</span> : null}</div>
              <div className="sub-price"><b><Taka>৳</Taka>{p.price_taka}</b><small>{p.price_taka === 0 ? 'free for now' : p.period === 'year' ? '/ year' : p.period === 'once' ? 'one-time' : '/ month'}</small></div>
              <span className="sub-for">{p.description}</span>
              <ul className="sub-feats">{feats.map(f => <li key={f}>{f}</li>)}{notFeats.map(f => <li key={f} className="no">{f}</li>)}</ul>
              <button type="button" className="sub-choose" onClick={e => { e.stopPropagation(); if (isCurrent || isPending) return; if (p.price_taka > 0) setPayFor(p); }}>{isCurrent ? 'Current plan — selected' : isPending ? 'Waiting for confirmation' : `Choose ${p.name}`}</button>
            </div>
          );
        })}
      </div>
      {payFor && <PayModal pkg={payFor} payNumbers={data.pay_numbers} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); reload(); }} />}
    </div>
  );
}

function PayModal({ pkg, payNumbers, onClose, onDone }) {
  const [method, setMethod] = useState('bkash');
  const [sender, setSender] = useState('');
  const [trxid, setTrxid] = useState('');
  const mName = method === 'bkash' ? 'bKash' : 'Nagad';
  const number = method === 'bkash' ? payNumbers.bkash : payNumbers.nagad;
  async function submitPayment(e) {
    e.preventDefault();
    try { await api('/api/payments', { method: 'POST', body: { package_id: pkg.id, method, sender_number: sender, trxid } }); toast('Waiting for confirmation'); onDone(); } catch (err) { toast(err.message); }
  }
  return (
    <Overlay label="Pay with bKash or Nagad"><div className="modal">
      <div className="modal-head"><div><h3>Pay for {pkg.name} — manual payment</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="mp-amount"><span><small>{pkg.name} plan · per month</small><b><Taka>৳</Taka>{pkg.price_taka}</b></span><span className="mp-send">SEND MONEY</span></div>
      <div className="mp-sec-t"><span className="n">1</span> Send the money</div>
      <div className="field" style={{ marginTop: 12 }}><label>I will pay with</label><PayDD value={method} onChange={setMethod} /></div>
      <div className="mp-nums">
        {METHODS.map(m => (
          <button type="button" key={m.id} className={`mp-num ${method === m.id ? 'on' : ''}`} onClick={() => setMethod(m.id)}>
            <span className="mp-num-top"><img className="paydd-logo" src={m.logo} alt="" /><b>{m.name}</b></span>
            <span className="mp-num-n">{m.id === 'bkash' ? payNumbers.bkash : payNumbers.nagad}</span>
            <small>Send Money to this {m.name} number</small>
          </button>
        ))}
      </div>
      <ol className="mp-steps">
        <li><span className="n">1</span><span>Open {mName} on your phone and choose “Send Money”.</span></li>
        <li><span className="n">2</span><span>Send exactly <Taka>৳</Taka>{pkg.price_taka} to {number} — our {mName} number.</span></li>
        <li><span className="n">3</span><span>{mName} will send you a confirmation message with a Transaction ID (TrxID).</span></li>
      </ol>
      <div className="mp-sec-t"><span className="n">2</span> Submit your proof</div>
      <form onSubmit={submitPayment}>
        <div className="field"><label>How did you pay?</label><PayDD value={method} onChange={setMethod} /></div>
        <div className="field"><label>The number you sent from</label><input inputMode="tel" placeholder="Sender number" autoComplete="tel" value={sender} onChange={e => setSender(e.target.value)} required /></div>
        <div className="field"><label>Transaction ID (TrxID)</label><input placeholder="Transaction ID (TrxID)" autoComplete="off" style={{ textTransform: 'uppercase' }} value={trxid} onChange={e => setTrxid(e.target.value)} required /></div>
        <div className="modal-actions"><button type="button" className="btn-soft" style={{ flex: '0 0 auto', padding: '0 18px' }} onClick={onClose}>Not now</button><button type="submit" className="btn-accent2" style={{ flex: 1 }}>Submit — I have paid →</button></div>
      </form>
    </div></Overlay>
  );
}

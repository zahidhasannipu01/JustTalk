'use client';
import { useEffect, useState } from 'react';
import { api, toast } from '@/lib/toast';

const KINDS = ['Calls & audio', 'Account & login', 'Subscription & payment', 'AI daily report', 'Safety / report a user', 'App bug', 'Other'];
const STATUS = { open: ['In progress', ''], answered: ['Answered', 'answered'], resolved: ['Resolved', 'resolved'] };
function rel(d) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) { const h = Math.round(mins / 60); return h === 1 ? '1 hr ago' : `${h} hrs ago`; }
  const days = Math.round(mins / 1440);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return `${Math.round(days / 7)} weeks ago`;
}
function openedLabel(d) {
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(new Date(d).setHours(0, 0, 0, 0))) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return `${Math.round(days / 7)} weeks ago`;
}
export default function SupportView() {
  const [tickets, setTickets] = useState([]);
  const [kind, setKind] = useState(KINDS[0]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  async function load() { try { const d = await api('/api/tickets'); setTickets(d.tickets); } catch {} }
  useEffect(() => { load(); }, []);
  async function submit(e) { e.preventDefault(); try { await api('/api/tickets', { method: 'POST', body: { kind, subject, body } }); setSubject(''); setBody(''); toast('Ticket opened'); load(); } catch (err) { toast(err.message); } }
  return (
    <div className="supportview">
      <div className="sup-grid">
        <div className="sup-panel">
          <h4>Create a ticket</h4>
          <form className="sup-form" onSubmit={submit}>
            <div className="field"><label>Issue type</label><div className="chips sup-cat-chips">{KINDS.map(k => <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}</div></div>
            <div className="field"><label>Subject</label><input className="sup-subject" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required /></div>
            <div className="field"><label>Problem</label><textarea className="sup-body" style={{ minHeight: 130 }} placeholder="Problem" value={body} onChange={e => setBody(e.target.value)} required /></div>
            <div className="modal-actions"><button type="submit" className="btn-accent2" style={{ flex: 1 }}>Open ticket →</button></div>
          </form>
        </div>
        <div className="sup-panel"><h4>My tickets</h4>
          <p>{tickets.length} tickets · newest first.</p>
          <div className="sup-list">
            {tickets.map(t => {
              const [label, cls] = STATUS[t.status] || STATUS.open;
              const meta = t.status === 'resolved' ? `Opened ${openedLabel(t.created_at)} · resolved ${rel(t.updated_at)}`
                : t.status === 'answered' ? `Opened ${openedLabel(t.created_at)} · answered ${rel(t.updated_at)}`
                : t.admin_note ? `Opened ${openedLabel(t.created_at)} · last reply ${rel(t.updated_at)}` : `Opened ${openedLabel(t.created_at)}`;
              return (
                <div className="ticket" key={t.id}>
                  <div className="ticket-top"><span className="ticket-id">#{t.id}</span><b>{t.subject}</b><span className={`sup-status ${cls}`} style={{ marginLeft: 'auto' }}>{label}</span></div>
                  <span className="log-badge user-report" style={{ marginTop: 7 }}>{t.kind}</span>
                  <p>{t.body}</p>
                  {t.admin_note ? <div className="sup-reply"><b>Support reply</b>{t.admin_note}</div> : null}
                  <span className="ticket-meta">{meta}</span>
                </div>
              );
            })}
          </div>
          {tickets.length === 0 && <p className="empty-note">No tickets yet.</p>}
        </div>
      </div>
    </div>
  );
}

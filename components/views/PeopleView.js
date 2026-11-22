'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ic, Avatar } from '../icons';
import Overlay from '../Overlay';
import { api, toast, colorFor } from '@/lib/toast';

const REASONS = ['Harassment', 'Inappropriate behaviour', 'Spam or scam', 'Hate speech', 'Impersonation', 'Other'];

export default function PeopleView({ people, everyone, requests, reload, onCall, onChat }) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [reportP, setReportP] = useState(null);
  const [blockP, setBlockP] = useState(null);
  const [unfriendP, setUnfriendP] = useState(null);
  const all = everyone || people;
  const list = useMemo(() => all.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [all, search]);
  async function respond(r, accept) { try { await api('/api/people/respond', { method: 'POST', body: { user_id: r.id, accept } }); reload(); } catch (e) { toast(e.message); } }
  async function addFriend(p) { try { const d = await api('/api/people/add', { method: 'POST', body: { user_id: p.id } }); toast(d.status === 'accepted' ? 'Added to your people' : 'Friend request sent'); reload(); } catch (e) { toast(e.message); } }
  async function unblock(p) { try { await api('/api/people/block', { method: 'POST', body: { user_id: p.id, block: false } }); toast('Unblocked'); reload(); } catch (e) { toast(e.message); } }
  return (
    <div className="peoplepage" aria-label="People">
      <div className="pp-head"><h3>People</h3><p>{all.length} people · tap + to add someone new.</p></div>
      <div className="pp-body">
        <div className="pp-search-row">
          <div className="search"><Ic n="search" size={17} /><input type="search" placeholder="Search people…" aria-label="Search people" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button type="button" className="pp-add-trigger" onClick={() => setAddOpen(true)}><Ic n="adduser" />Add person</button>
        </div>
        {requests.length > 0 && <div style={{ marginBottom: 16 }}><div className="req-label">Friend request</div><div style={{ display: 'grid', gap: 14 }}>{requests.map(r => (
          <div className="pcard" key={r.id}>
            <div className="pc-top">
              <span className="av-wrap"><Avatar user={{ ...r, color: colorFor(r.id) }} size={50} />{r.is_online ? <i className="presence" title="Online"></i> : null}</span>
              <span className="pc-id">
                <span className="pc-name">{r.name}</span>
                <span className="pc-status">{r.is_online ? <><span className="dot-on"></span>Online<span className="sep">·</span></> : null}<span className="note">wants to practise with you</span></span>
              </span>
            </div>
            <div className="pc-actions">
              <button type="button" className="pc-pill accept" aria-label={`Accept ${r.name}`} onClick={() => respond(r, true)}><Ic n="check" />Accept</button>
              <button type="button" className="pc-pill decline" aria-label={`Decline ${r.name}`} onClick={() => respond(r, false)}><Ic n="close" />Decline</button>
            </div>
          </div>
        ))}</div></div>}
        <div className="people-list">
          {list.map(p => (
            <div className="pcard" key={p.id}>
              <div className="pc-top">
                <span className="av-wrap"><Avatar user={{ ...p, color: colorFor(p.id) }} size={50} />{p.online && <i className="presence" title="Online"></i>}</span>
                <span className="pc-id">
                  <span className="pc-name">{p.name}{p.blocked_by_me && <span className="blocked-tag">Blocked</span>}</span>
                  <span className="pc-status"><span className={p.online ? 'dot-on' : 'dot-off'}></span>{p.online ? 'Online' : 'Last seen recently'}{p.note ? <><span className="sep">·</span><span className="note">{p.note}</span></> : null}</span>
                </span>
                <button type="button" className="pc-call" title="Call" aria-label={`Call ${p.name}`} onClick={() => onCall(p, 'video')}><Ic n="phone" /></button>
              </div>
              {(p.rating != null || p.phone) && (
                <div className="pc-meta">
                  {p.rating != null && <span className="pc-rate"><span className="star">★</span>{Number(p.rating).toFixed(1)} ({p.ratings_count} ratings)</span>}
                  {p.rating != null && p.phone && <span className="dotsep">·</span>}
                  {p.phone && <span className="pc-phone"><Ic n="phone" size={12} />{p.phone}</span>}
                </div>
              )}
              <div className="pc-actions">
                {p.is_friend
                  ? <button type="button" className="pc-pill unfriend" aria-label={`Unfriend ${p.name}`} onClick={() => setUnfriendP(p)}><Ic n="removeuser" />Unfriend</button>
                  : p.request_sent
                    ? <button type="button" className="pc-pill added" aria-label={`Friend request sent to ${p.name}`} disabled><Ic n="check" />Requested</button>
                    : <button type="button" className="pc-pill add" aria-label={`Add ${p.name} as a friend`} onClick={() => addFriend(p)}><Ic n="adduser" />Add friend</button>}
                <button type="button" className="pc-pill report" aria-label={`Report ${p.name}`} onClick={() => setReportP(p)}><Ic n="flag" />Report</button>
                {p.blocked_by_me
                  ? <button type="button" className="pc-pill unblock" aria-label={`Unblock ${p.name}`} onClick={() => unblock(p)}><Ic n="unblock" />Unblock</button>
                  : <button type="button" className="pc-pill block" aria-label={`Block ${p.name}`} onClick={() => setBlockP(p)}><Ic n="ban" />Block</button>}
              </div>
            </div>
          ))}
        </div>
        {list.length === 0 && <p className="empty-note people-page-empty">{all.length ? 'No friend matches that search.' : 'No people yet — after a random call, send a friend request to add someone here.'}</p>}
      </div>
      {addOpen && <AddPersonModal onClose={() => setAddOpen(false)} reload={reload} />}
      {reportP && <ReportModal person={reportP} onClose={() => setReportP(null)} />}
      {blockP && <BlockModal person={blockP} onClose={() => setBlockP(null)} reload={reload} />}
      {unfriendP && <UnfriendModal person={unfriendP} onClose={() => setUnfriendP(null)} reload={reload} />}
    </div>
  );
}

export function ReportModal({ person, onClose }) {
  const [reason, setReason] = useState('Harassment');
  const [details, setDetails] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { await api('/api/people/report', { method: 'POST', body: { user_id: person.id, reason: details.trim() ? `${reason} — ${details.trim()}` : reason } }); toast('Report sent'); onClose(); }
    catch (err) { toast(err.message); }
  }
  return (
    <Overlay label="Report this person"><div className="modal">
      <div className="modal-head"><div><h3>Report this person?</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="block-hero"><Avatar user={{ ...person, color: colorFor(person.id) }} size={46} /><span><b>{person.name}</b><small>{person.note || 'Practice partner'}</small></span></div>
      <form onSubmit={submit}>
        <div className="field"><label>Why are you reporting them?</label><div className="chips">{REASONS.map(r => <button type="button" key={r} className={reason === r ? 'on' : ''} onClick={() => setReason(r)}>{r}</button>)}</div></div>
        <div className="field"><label>What happened? <span style={{ color: 'var(--muted)', fontWeight: 600 }}>(optional)</span></label><textarea placeholder="Details" value={details} onChange={e => setDetails(e.target.value)} /></div>
        <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="submit" className="btn-accent2">Send report</button></div>
      </form>
    </div></Overlay>
  );
}

export function BlockModal({ person, onClose, reload, onBlocked }) {
  const un = person.blocked_by_me;
  async function confirm() {
    try { await api('/api/people/block', { method: 'POST', body: { user_id: person.id, block: !un } }); toast(un ? 'Unblocked' : 'Blocked'); onClose(); reload && reload(); if (!un && onBlocked) onBlocked(); }
    catch (e) { toast(e.message); }
  }
  return (
    <Overlay label={un ? 'Unblock this person' : 'Block this person'}><div className="modal">
      <div className="modal-head"><div><h3>{un ? 'Unblock this person?' : 'Block this person?'}</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="block-hero"><Avatar user={{ ...person, color: colorFor(person.id) }} size={46} /><span><b>{person.name}</b><small>{person.note || 'Practice partner'}</small></span></div>
      <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="button" className="btn-block-confirm" onClick={confirm}>{un ? 'Unblock' : 'Block'}</button></div>
    </div></Overlay>
  );
}

export function UnfriendModal({ person, onClose, reload }) {
  async function confirm() {
    try { await api('/api/people/unfriend', { method: 'POST', body: { user_id: person.id } }); toast('Unfriended'); onClose(); reload && reload(); }
    catch (e) { toast(e.message); }
  }
  return (
    <Overlay label="Unfriend this person"><div className="modal">
      <div className="modal-head"><div><h3>Unfriend this person?</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="block-hero"><Avatar user={{ ...person, color: colorFor(person.id) }} size={46} /><span><b>{person.name}</b><small>{person.note || 'Practice partner'}</small></span></div>
      <div className="modal-actions"><button type="button" className="btn-soft" onClick={onClose}>Cancel</button><button type="button" className="btn-block-confirm" onClick={confirm}>Unfriend</button></div>
    </div></Overlay>
  );
}

function AddPersonModal({ onClose, reload }) {
  const [term, setTerm] = useState(''); const [results, setResults] = useState(null); const [sent, setSent] = useState({});
  const timer = useRef(null);
  useEffect(() => {
    if (!term.trim()) { setResults(null); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { try { const d = await api(`/api/people?search=${encodeURIComponent(term.trim())}`); setResults(d.results); } catch {} }, 350);
    return () => clearTimeout(timer.current);
  }, [term]);
  async function add(u) { try { const d = await api('/api/people/add', { method: 'POST', body: { user_id: u.id } }); setSent(s => ({ ...s, [u.id]: d.status })); toast(d.status === 'accepted' ? 'Added to your people' : 'Friend request sent'); reload(); } catch (err) { toast(err.message); } }
  return (
    <Overlay label="Add person"><div className="modal">
      <div className="modal-head"><div><h3>Add person</h3></div><button className="x" type="button" aria-label="Close" onClick={onClose}>×</button></div>
      <form onSubmit={e => e.preventDefault()}>
        <div className="field"><label>Search by name or email</label><input type="text" placeholder="Type a name or email address" autoComplete="off" value={term} onChange={e => setTerm(e.target.value)} /></div>
        <div className="ap-results">
          {results?.map(u => (
            <div className="person" key={u.id}><span className="av-wrap"><Avatar user={{ ...u, color: colorFor(u.id) }} size={42} />{u.online ? <i className="presence" title="Online"></i> : null}</span><span style={{ flex: 1 }}><b>{u.name}</b><small>{u.online ? 'Online' : 'Offline'}{u.note ? ` · ${u.note}` : ''}</small></span>
              {u.is_friend ? <span className="sub-tag cur">Added</span> : sent[u.id] ? <span className="sub-tag cur">Request sent</span> : <button type="button" className="fr-btn" onClick={() => add(u)}>Add</button>}</div>
          ))}
        </div>
        {results === null && <p className="ap-state">Search for someone on Talk by their name or their email address, then tap Add.</p>}
        {results && results.length === 0 && <p className="ap-state">No one found with that name or email.</p>}
        <div className="modal-actions"><button type="button" className="btn-soft" style={{ flex: 1 }} onClick={onClose}>Cancel</button></div>
      </form>
    </div></Overlay>
  );
}

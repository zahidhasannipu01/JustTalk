'use client';
import { useMemo, useState } from 'react';
import { Ic, Avatar } from '../icons';
import { colorFor } from '@/lib/toast';

export default function RoomsView({ rooms, onJoin, onOpenPeople, onOpenCreate }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => rooms.filter(r => (r.title + ' ' + (r.topic || '')).toLowerCase().includes(search.toLowerCase())), [rooms, search]);
  return (
    <div className="rooms-view">
      <div className="m-room-search-row">
        <div className="search"><Ic n="search" size={17} /><input type="search" placeholder="Search rooms, people, topics…" aria-label="Search rooms" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button type="button" className="m-room-iconbtn create" title="Start a practice room" aria-label="Start a practice room" onClick={onOpenCreate}><Ic n="plus" /></button>
        <button type="button" className="m-room-iconbtn people" title="Find people to call" aria-label="Find people to call" onClick={onOpenPeople}><Ic n="people" /></button>
      </div>
      <div className="sec-row"><b>Live rooms</b><a onClick={onOpenPeople}>See people →</a></div>
      <div className="rooms2">
        {list.map(r => (
          <article className="room" key={r.id}>
            <div className="faces">
              {(r.faces || []).slice(0, 3).map(f => <Avatar key={f.id} user={{ ...f, color: colorFor(f.id) }} size={40} fontSize={12} />)}
              {(r.occupants || 0) > 3 && <span className="faces-more">+{r.occupants - 3}</span>}
              {(r.faces || []).length === 0 && <span className="faces-ghost" title="Nobody inside right now"></span>}
            </div>
            <h3>{r.title}</h3><p>{r.topic}</p>
            <div className="meta">
              {r.visibility === 'private'
                ? <span className="vis vis-priv"><Ic n="lock" size={13} />Private</span>
                : <span className="vis vis-pub"><Ic n="lockOpen" size={13} />Public</span>}
              <span>{r.speaking || 0} speaking</span>
            </div>
            <button className="join" type="button" onClick={() => onJoin(r)}><Ic n="mic" size={16} /><span>{r.visibility === 'private' ? 'Join with password' : 'Join room'}</span></button>
          </article>
        ))}
      </div>
      {list.length === 0 && <p className="empty-note">No room matches that search.</p>}
      <div className="create-bar"><div><b>Start your own room</b></div><button type="button" onClick={onOpenCreate}>+ Create room</button></div>
    </div>
  );
}

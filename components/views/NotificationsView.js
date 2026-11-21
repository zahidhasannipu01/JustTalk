'use client';
import { Avatar } from '../icons';
import { Taka, colorFor } from '@/lib/toast';

// The full Notifications page — the bell tray is only a 10-item preview with a
// "See all" that lands here. Same rows and sections as the tray, unabridged.
function ntTime(d) {
  const t = new Date(d); const now = new Date();
  if (t.toDateString() === now.toDateString()) return t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'Yesterday';
  return t.toLocaleDateString('en-GB', { weekday: 'short' });
}
function Row({ icon, title, body, time, unread, missed, onClick }) {
  return (
    <div className="nt-item" onClick={onClick} role={onClick ? 'button' : undefined} style={onClick ? { cursor: 'pointer' } : undefined}>
      {icon}
      <span className="nt-meta"><span className="nt-top"><b>{title}</b><span className="nt-time">{time}</span></span><small className={missed ? 'nt-missed' : ''}>{body}</small></span>
      {unread ? <i className="nt-dot"></i> : null}
    </div>
  );
}

export default function NotificationsView({ notifs, onMarkAllRead, onOpenPeople }) {
  const pay = notifs.filter(n => n.kind === 'subscription_reminder');
  const missed = notifs.filter(n => n.kind === 'missed_call');
  const reqs = notifs.filter(n => n.kind === 'friend_request' || n.kind === 'friend_accepted');
  const msgs = notifs.filter(n => n.kind === 'message');
  const other = notifs.filter(n => !['subscription_reminder', 'missed_call', 'message', 'friend_request', 'friend_accepted'].includes(n.kind));
  const actorIcon = n => <Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={40} />;
  return (
    <div className="ntview" aria-label="Notifications">
      <div className="ntview-head">
        <div><h3>Notifications</h3><p>{notifs.length} in total · newest first</p></div>
        {notifs.some(n => !n.is_read) && <button type="button" className="nt-clear" onClick={onMarkAllRead}>Mark all read</button>}
      </div>
      {pay.length > 0 && <><div className="nt-sec">Payments</div>{pay.map(n => (
        <Row key={n.id} icon={<span className="avatar" style={{ background: 'var(--green)' }}><Taka>৳</Taka></span>} title="Payment reminder" body={n.body} time="Auto" unread={!n.is_read} />
      ))}</>}
      {missed.length > 0 && <><div className="nt-sec">Missed calls</div>{missed.map(n => (
        <Row key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} body="Missed call" time={ntTime(n.created_at)} unread={!n.is_read} missed />
      ))}</>}
      {reqs.length > 0 && <><div className="nt-sec">Friend requests</div>{reqs.map(n => (
        <Row key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} onClick={n.kind === 'friend_request' ? onOpenPeople : undefined} />
      ))}</>}
      {msgs.length > 0 && <><div className="nt-sec">Messages</div>{msgs.map(n => (
        <Row key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
      ))}</>}
      {other.map(n => (
        <Row key={n.id} icon={actorIcon(n)} title={n.title} body={n.body} time={ntTime(n.created_at)} unread={!n.is_read} />
      ))}
      {notifs.length === 0 && <p className="nt-empty">No notifications.</p>}
    </div>
  );
}

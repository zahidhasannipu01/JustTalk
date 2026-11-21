'use client';
import { Avatar } from '../icons';
import { Taka, colorFor } from '@/lib/toast';

// The full Notifications page — the bell tray is only a 10-item preview with
// a "See all" that lands here. Redesigned as detailed cards: a type chip and
// a plain detail sentence on every card, an action where one belongs (Pay
// now, Call back, Accept/Decline), and a click always goes to the place the
// notification is about.
function ntWhen(d) {
  const t = new Date(d); const now = new Date();
  const hm = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (t.toDateString() === now.toDateString()) return `Today · ${hm}`;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return `Yesterday · ${hm}`;
  if (now - t < 7 * 86400000) return `${t.toLocaleDateString('en-GB', { weekday: 'long' })} · ${hm}`;
  return `${t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${hm}`;
}
const firstName = n => (n.actor_name || n.title || 'Someone').split(' ')[0];

function Card({ icon, title, chip, chipCls, detail, when, unread, onClick, actions, chev }) {
  return (
    <div className={`ntcard ${unread ? 'unread' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {icon}
      <div className="ntcard-body">
        <div className="ntcard-l1"><b>{title}</b>{chip ? <span className={`nt-chip ${chipCls || ''}`}>{chip}</span> : null}</div>
        <p className="ntcard-l2">{detail}</p>
        <div className="ntcard-l3">{unread ? <i className="nt-udot"></i> : null}{when}</div>
      </div>
      {actions ? <span className="ntcard-acts" onClick={e => e.stopPropagation()}>{actions}</span> : null}
      {chev ? <span className="nt-chev">›</span> : null}
    </div>
  );
}

export default function NotificationsView({ notifs, requests, onMarkAllRead, onOpenPeople, onOpenChat, onOpenSubscription, onCallBack, onRespond }) {
  // Accept/Decline belong on a card only while that request is still
  // pending — once answered, the card stays as history without buttons.
  const pendingIds = new Set((requests || []).map(r => Number(r.id)));
  const pay = notifs.filter(n => n.kind === 'subscription_reminder');
  const missed = notifs.filter(n => n.kind === 'missed_call');
  const reqs = notifs.filter(n => n.kind === 'friend_request' || n.kind === 'friend_accepted');
  const msgs = notifs.filter(n => n.kind === 'message');
  const other = notifs.filter(n => !['subscription_reminder', 'missed_call', 'message', 'friend_request', 'friend_accepted'].includes(n.kind));
  const unread = notifs.filter(n => !n.is_read).length;
  const actorIcon = n => <Avatar user={{ name: n.actor_name || n.title, avatar: n.actor_avatar, color: colorFor(n.actor_id || 0) }} size={46} />;
  const sec = (label, arr) => arr.length > 0 ? <div className="nt-sec">{label}<span className="nt-sec-n">· {arr.length}</span></div> : null;
  return (
    <div className="ntview" aria-label="Notifications">
      <div className="nt-toolbar">
        <span className="nt-count">{notifs.length} notifications</span>
        {unread > 0 && <span className="nt-unread-pill">{unread} unread</span>}
        {unread > 0 && <button type="button" className="nt-markall" onClick={onMarkAllRead}>Mark all read</button>}
      </div>
      {sec('Payments', pay)}
      {pay.map(n => (
        <Card key={n.id} icon={<span className="nt-pay-ic"><Taka>৳</Taka></span>} title="Payment reminder" chip="Payment" chipCls="pay"
          detail={n.body} when={`${ntWhen(n.created_at)} · Auto reminder`} unread={!n.is_read}
          onClick={onOpenSubscription} chev
          actions={<button type="button" className="nt-btn nt-btn-pay" onClick={onOpenSubscription}>Pay now</button>} />
      ))}
      {sec('Missed calls', missed)}
      {missed.map(n => (
        <Card key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} chip="Missed call" chipCls="missed"
          detail={`${firstName(n)} called you — tap to open the chat and see the call.`} when={ntWhen(n.created_at)} unread={!n.is_read}
          onClick={onOpenChat ? () => onOpenChat(n) : undefined} chev
          actions={onCallBack && n.actor_id ? <button type="button" className="nt-btn nt-btn-call" onClick={() => onCallBack({ id: n.actor_id, name: n.actor_name || n.title, avatar: n.actor_avatar })}>Call back</button> : null} />
      ))}
      {sec('Friend requests', reqs)}
      {reqs.map(n => n.kind === 'friend_request' ? (
        <Card key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} chip="Friend request" chipCls="req"
          detail={pendingIds.has(Number(n.actor_id)) ? `${firstName(n)} sent you a friend request. Accept to practise together and chat anytime.` : n.body} when={ntWhen(n.created_at)} unread={!n.is_read}
          onClick={onOpenPeople} chev={!pendingIds.has(Number(n.actor_id))}
          actions={pendingIds.has(Number(n.actor_id)) && onRespond && n.actor_id ? <><button type="button" className="nt-btn nt-btn-soft" onClick={() => onRespond(n.actor_id, false)}>Decline</button><button type="button" className="nt-btn nt-btn-dark" onClick={() => onRespond(n.actor_id, true)}>Accept</button></> : null} />
      ) : (
        <Card key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} chip="New friend" chipCls="pay"
          detail={n.body} when={ntWhen(n.created_at)} unread={!n.is_read} onClick={onOpenPeople} chev />
      ))}
      {sec('Messages', msgs)}
      {msgs.map(n => (
        <Card key={n.id} icon={actorIcon(n)} title={n.actor_name || n.title} chip="Message" chipCls="msg"
          detail={`“${n.body}”`} when={`${ntWhen(n.created_at)} — tap to open the conversation`} unread={!n.is_read}
          onClick={onOpenChat ? () => onOpenChat(n) : undefined} chev />
      ))}
      {sec('Other', other)}
      {other.map(n => (
        <Card key={n.id} icon={actorIcon(n)} title={n.title} chip="System" chipCls=""
          detail={n.body} when={ntWhen(n.created_at)} unread={!n.is_read} />
      ))}
      {notifs.length === 0 && <p className="nt-empty">No notifications.</p>}
    </div>
  );
}

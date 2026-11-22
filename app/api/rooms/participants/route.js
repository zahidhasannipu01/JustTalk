import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubRoomsLive } from '@/lib/hub';

// Who is inside this room right now (socket membership), with each person's
// friendship state relative to me — the meeting's Participants panel renders
// straight from this: Add friend / Requested / Friends / Accept.
export async function GET(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const roomId = Number(new URL(req.url).searchParams.get('room_id'));
  const room = await q1('SELECT id, creator_id FROM rooms WHERE id = ?', [roomId]);
  if (!room) return fail('Room not found', 404);
  const live = await hubRoomsLive();
  const entry = live.find(x => Number(x.id) === roomId);
  const ids = entry ? entry.occupants.map(o => Number(o.id)) : [me.id];
  if (!ids.includes(me.id)) ids.push(me.id);
  const users = await q(`SELECT id, name, avatar FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const byId = new Map(users.map(u => [Number(u.id), u]));
  const rels = await q('SELECT requester_id, addressee_id, status FROM friendships WHERE requester_id = ? OR addressee_id = ?', [me.id, me.id]);
  const accepted = new Set(); const sent = new Set(); const received = new Set();
  for (const f of rels) {
    const other = Number(f.requester_id) === me.id ? Number(f.addressee_id) : Number(f.requester_id);
    if (f.status === 'accepted') accepted.add(other);
    else if (f.status === 'pending') { if (Number(f.requester_id) === me.id) sent.add(other); else received.add(other); }
  }
  const occupants = ids.map(id => {
    const u = byId.get(id) || { id, name: 'Someone', avatar: null };
    return {
      id, name: u.name, avatar: u.avatar,
      is_me: id === me.id,
      is_host: id === Number(room.creator_id),
      is_friend: accepted.has(id),
      request_sent: sent.has(id),
      request_received: received.has(id),
    };
  });
  // Host first, then me, then everyone else by name.
  occupants.sort((a, b) => (b.is_host - a.is_host) || (b.is_me - a.is_me) || String(a.name).localeCompare(String(b.name)));
  return ok({ host_id: Number(room.creator_id), occupants });
}

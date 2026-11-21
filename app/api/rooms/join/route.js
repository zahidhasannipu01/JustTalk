import bcrypt from 'bcryptjs';
import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const room = await q1('SELECT * FROM rooms WHERE id = ?', [Number(b?.room_id)]);
  if (!room) return fail('Room not found', 404);
  if (room.visibility === 'private') {
    if (!b.password || !(await bcrypt.compare(String(b.password), room.password_hash || ''))) return fail('Wrong room password', 403);
  }
  const channel = `room-${room.id}`;
  const r = await q("INSERT INTO calls (caller_id, channel, kind, status, source, started_at) VALUES (?, ?, 'room', 'active', 'room', NOW())", [me.id, channel]);
  await q('UPDATE calls SET room_id = ? WHERE id = ?', [room.id, r.insertId]);
  return ok({ call_id: r.insertId, room_name: channel, room_id: room.id });
}

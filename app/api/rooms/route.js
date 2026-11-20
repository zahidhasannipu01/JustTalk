import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const rows = await q(`SELECT r.id, r.title, r.topic, r.visibility, r.creator_id, r.created_at, (SELECT COUNT(*) FROM calls c WHERE c.room_id = r.id AND c.status = 'active') AS live_calls FROM rooms r ORDER BY r.created_at DESC`);
  for (const r of rows) {
    // Face stack: the room creator plus people who have practised in the room (real history).
    const faces = await q(`SELECT DISTINCT u.id, u.name, u.avatar FROM users u WHERE u.id = ? OR u.id IN (SELECT caller_id FROM calls WHERE room_id = ?) ORDER BY (u.id = ?) ASC, u.id LIMIT 3`, [r.creator_id || 0, r.id, r.creator_id || 0]);
    r.faces = faces;
    r.speaking = Number(r.live_calls) || 0;
  }
  return ok({ rooms: rows });
}
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null);
  if (!b?.title) return fail('Room title is required');
  const vis = b.visibility === 'private' ? 'private' : 'public';
  if (vis === 'private' && !b.password) return fail('A private room needs a password');
  const hash = vis === 'private' ? await bcrypt.hash(String(b.password), 10) : null;
  const r = await q('INSERT INTO rooms (title, topic, visibility, password_hash, creator_id) VALUES (?,?,?,?,?)', [b.title, b.topic || null, vis, hash, me.id]);
  return ok({ id: r.insertId });
}

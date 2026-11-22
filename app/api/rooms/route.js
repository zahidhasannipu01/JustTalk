import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { hubRoomsLive } from '@/lib/hub';

export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const rows = await q(`SELECT r.id, r.title, r.topic, r.visibility, r.creator_id, r.created_at FROM rooms r ORDER BY r.created_at DESC`);
  // The face stack is who is inside the room RIGHT NOW (socket membership),
  // never past callers. An empty room simply has no faces.
  const live = await hubRoomsLive();
  const byId = new Map(live.map(x => [Number(x.id), x]));
  for (const r of rows) {
    const l = byId.get(Number(r.id));
    r.faces = l ? l.occupants : [];
    r.occupants = l ? l.occupants.length : 0;
    r.speaking = l ? l.speaking : 0;
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

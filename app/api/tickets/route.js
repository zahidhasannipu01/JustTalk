import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function GET() { const me = await currentUser(); if (!me) return fail('Not signed in', 401); const rows = await q('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY id DESC', [me.id]); return ok({ tickets: rows }); }
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null);
  if (!b?.kind || !b?.subject || !b?.body) return fail('Choose a kind and write your problem');
  const r = await q('INSERT INTO support_tickets (user_id, kind, subject, body) VALUES (?,?,?,?)', [me.id, String(b.kind), String(b.subject), String(b.body)]);
  return ok({ id: r.insertId });
}

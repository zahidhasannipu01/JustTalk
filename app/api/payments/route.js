import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null);
  const pkg = await q1('SELECT * FROM packages WHERE id = ? AND is_active = 1', [Number(b?.package_id)]);
  if (!pkg) return fail('Package not found', 404);
  if (!['bkash', 'nagad'].includes(b?.method)) return fail('Choose bKash or Nagad');
  if (!b?.sender_number || !b?.trxid) return fail('Sender number and TrxID are required');
  const r = await q("INSERT INTO payment_requests (user_id, package_id, method, sender_number, trxid, amount_taka, status) VALUES (?,?,?,?,?,?,'waiting')", [me.id, pkg.id, b.method, String(b.sender_number), String(b.trxid), pkg.price_taka]);
  return ok({ id: r.insertId, status: 'waiting' });
}

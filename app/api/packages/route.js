import { q, q1 } from '@/lib/db';
import { ok, fail } from '@/lib/respond';
import { currentUser } from '@/lib/auth';
import { currentSubscription } from '@/lib/subscription';
export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const packages = await q('SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order, id');
  const settings = await q("SELECT k, v FROM app_settings WHERE k IN ('pay_bkash_number','pay_nagad_number')");
  const pay = Object.fromEntries(settings.map(s => [s.k, s.v]));
  const sub = await currentSubscription(me.id);
  const pending = await q1("SELECT * FROM payment_requests WHERE user_id = ? AND status = 'waiting' ORDER BY id DESC LIMIT 1", [me.id]);
  return ok({ packages, pay_numbers: { bkash: pay.pay_bkash_number || '', nagad: pay.pay_nagad_number || '' }, subscription: sub, pending_payment: pending });
}

import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  if (!target || target === me.id) return fail('Invalid person');
  await q('INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)', [me.id, target, b.reason || null]);
  return ok();
}

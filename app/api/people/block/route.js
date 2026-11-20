import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); const target = Number(b?.user_id);
  if (!target || target === me.id) return fail('Invalid person');
  if (b.block === false) await q('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [me.id, target]);
  else await q('INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [me.id, target]);
  return ok({ blocked: b.block !== false });
}

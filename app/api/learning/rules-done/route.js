import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { TOTAL_CHAPTERS } from '@/lib/learning';

// "Mark rules as finished" — unlocks the chapter's practice batches.
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const body = await req.json().catch(() => ({}));
  const chapter = Number(body.chapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > TOTAL_CHAPTERS) return fail('Bad chapter', 400);
  await q('INSERT INTO learning_progress (user_id, chapter, rules_done) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE rules_done = 1', [me.id, chapter]);
  return ok({});
}

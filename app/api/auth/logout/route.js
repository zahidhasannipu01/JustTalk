import { q } from '@/lib/db';
import { clearSession, currentUser } from '@/lib/auth';
import { ok } from '@/lib/respond';
export async function POST() { const u = await currentUser(); if (u) await q('UPDATE users SET is_online = 0, last_seen_at = NOW() WHERE id = ?', [u.id]); await clearSession(); return ok(); }

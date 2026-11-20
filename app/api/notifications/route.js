import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
export async function GET() { const me = await currentUser(); if (!me) return fail('Not signed in', 401); const rows = await q('SELECT n.*, u.name AS actor_name, u.avatar AS actor_avatar FROM notifications n LEFT JOIN users u ON u.id = n.actor_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 30', [me.id]); return ok({ notifications: rows }); }
export async function POST() { const me = await currentUser(); if (!me) return fail('Not signed in', 401); await q('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [me.id]); return ok(); }

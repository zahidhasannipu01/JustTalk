import { q } from '@/lib/db';
export async function logAdmin(adminId, action, detail) { try { await q('INSERT INTO admin_activity_log (admin_id, action, detail) VALUES (?,?,?)', [adminId || null, action, detail || null]); } catch {} }

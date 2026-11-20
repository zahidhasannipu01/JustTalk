import { clearSession, ADMIN_COOKIE } from '@/lib/auth';
import { ok } from '@/lib/respond';
export async function POST() { await clearSession(ADMIN_COOKIE); return ok(); }

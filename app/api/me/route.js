import bcrypt from 'bcryptjs';
import { q, q1 } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
import { RATING_SQL } from '@/lib/publicUser';
import { currentSubscription } from '@/lib/subscription';

export async function GET() {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const u = await q1(`SELECT u.*, (u.is_online = 1 AND last_seen_at >= NOW() - INTERVAL 90 SECOND) AS online_now, ${RATING_SQL} FROM users u WHERE u.id = ?`, [me.id]);
  const sub = await currentSubscription(me.id);
  const [tot] = await q('SELECT COALESCE(SUM(minutes),0) AS minutes, COALESCE(SUM(calls),0) AS calls FROM user_daily_stats WHERE user_id = ?', [me.id]);
  return ok({ user: { ...u, password_hash: undefined }, subscription: sub, totals: tot });
}
export async function PATCH(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const b = await req.json().catch(() => null); if (!b) return fail('Invalid request');
  // Email is locked after registration — never updated here.
  const fields = []; const vals = [];
  for (const k of ['name', 'avatar', 'phone', 'goal', 'bio', 'city', 'country']) if (b[k] !== undefined) { fields.push(`${k} = ?`); vals.push(b[k] || null); }
  if (b.phone_visibility !== undefined) { if (!['onlyme', 'friends', 'public'].includes(b.phone_visibility)) return fail('Invalid phone visibility'); fields.push('phone_visibility = ?'); vals.push(b.phone_visibility); }
  if (b.gender !== undefined) { if (!['female', 'male'].includes(b.gender)) return fail('Invalid gender'); fields.push('gender = ?'); vals.push(b.gender); }
  if (b.talk_preference !== undefined) { if (!['female', 'male', 'both'].includes(b.talk_preference)) return fail('Invalid preference'); fields.push('talk_preference = ?'); vals.push(b.talk_preference); }
  if (b.ai_reports_optin !== undefined) { fields.push('ai_reports_optin = ?'); vals.push(b.ai_reports_optin ? 1 : 0); }
  if (b.username !== undefined) {
    const un = String(b.username || '').trim().replace(/^@/, '').toLowerCase();
    if (un && !/^[a-z0-9_.]{3,40}$/.test(un)) return fail('Username needs 3+ characters: letters, numbers, dot or underscore');
    if (un) { const taken = await q1('SELECT id FROM users WHERE username = ? AND id != ?', [un, me.id]); if (taken) return fail('That username is taken'); }
    fields.push('username = ?'); vals.push(un || null);
  }
  if (b.new_password) {
    if (String(b.new_password).length < 6) return fail('Password must be at least 6 characters');
    if (b.current_password !== undefined) {
      const meRow = await q1('SELECT password_hash FROM users WHERE id = ?', [me.id]);
      if (!(await bcrypt.compare(String(b.current_password), meRow.password_hash))) return fail('Current password is wrong');
    }
    fields.push('password_hash = ?'); vals.push(await bcrypt.hash(String(b.new_password), 10));
  }
  if (!fields.length) return fail('Nothing to update');
  vals.push(me.id);
  await q(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, vals);
  return ok();
}

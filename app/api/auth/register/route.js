import bcrypt from 'bcryptjs';
import { q, q1 } from '@/lib/db';
import { makeSession } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';

export async function POST(req) {
  const b = await req.json().catch(() => null);
  if (!b) return fail('Invalid request');
  const { name, email, password, avatar, phone, phone_visibility, gender, talk_preference } = b;
  if (!name || !email || !password) return fail('Name, email and password are required');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address');
  if (password.length < 6) return fail('Password must be at least 6 characters');
  const exists = await q1('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return fail('An account with this email already exists', 409);
  let username = null;
  if (b.username) {
    username = String(b.username).trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_.]{3,40}$/.test(username)) return fail('Username needs 3+ characters: letters, numbers, dot or underscore');
    const taken = await q1('SELECT id FROM users WHERE username = ?', [username]);
    if (taken) return fail('That username is taken', 409);
  }
  const vis = ['onlyme', 'friends', 'public'].includes(phone_visibility) ? phone_visibility : 'onlyme';
  const g = ['female', 'male'].includes(gender) ? gender : null;
  const pref = ['female', 'male', 'both'].includes(talk_preference) ? talk_preference : 'both';
  const goal = ['Fluency', 'IELTS', 'Job interviews', 'Debate', 'Travel'].includes(b.goal) ? b.goal : (['Fluency', 'IELTS', 'Job interviews', 'Debate', 'Travel'].includes(b.practise_for) ? b.practise_for : null);
  const hash = await bcrypt.hash(password, 10);
  const ip = req.headers.get('x-forwarded-for') || '';
  const r = await q('INSERT INTO users (name, username, email, password_hash, avatar, phone, phone_visibility, gender, talk_preference, goal, last_ip, device, is_online, last_seen_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())',
    [name, username, email, hash, avatar || null, phone || null, vis, g, pref, goal, ip, req.headers.get('user-agent') || '']);
  const free = await q1("SELECT id FROM packages WHERE name = 'Free'");
  if (free) await q('INSERT INTO subscriptions (user_id, package_id, status) VALUES (?, ?, "active")', [r.insertId, free.id]);
  await makeSession({ uid: r.insertId, email, name });
  return ok({ user: { id: r.insertId, name, email } });
}

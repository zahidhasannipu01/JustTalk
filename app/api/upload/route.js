import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { currentUser } from '@/lib/auth';
import { ok, fail } from '@/lib/respond';
// Profile pictures only. Chat photos are phone-to-phone and are never uploaded (by design).
export async function POST(req) {
  const me = await currentUser(); if (!me) return fail('Not signed in', 401);
  const form = await req.formData(); const file = form.get('file');
  if (!file || typeof file === 'string') return fail('No file');
  if (!file.type.startsWith('image/')) return fail('Only images');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const name = `u${me.id}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads'); await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return ok({ url: '/uploads/' + name });
}

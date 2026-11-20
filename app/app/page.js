import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { q1 } from '@/lib/db';
import AppShell from '@/components/AppShell';
import '../shell.css';

export default async function AppPage() {
  const s = await currentUser();
  if (!s) redirect('/login');
  const u = await q1('SELECT id, name, email, avatar FROM users WHERE id = ?', [s.id]);
  if (!u) redirect('/login');
  return <AppShell initialUser={u} />;
}

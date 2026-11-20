import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import AdminPanel from '@/components/AdminPanel';
import '../shell.css';

export default async function AdminPage() {
  const a = await currentAdmin();
  if (!a) redirect('/admin/login');
  return <AdminPanel admin={a} />;
}

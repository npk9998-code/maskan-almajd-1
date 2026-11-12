import { redirect } from 'next/navigation';
import PinLogin from '@/components/admin/PinLogin';
import { getPageSession } from '@/lib/admin/session';

export const metadata = { title: 'الدخول' };

export default async function AdminLoginPage() {
  const session = await getPageSession();
  if (session.status === 'ok') redirect('/admin');
  if (session.status === 'refresh') redirect('/admin/refresh?next=/admin');
  return <PinLogin />;
}

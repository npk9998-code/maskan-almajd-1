import AdminNav from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/admin/session';

// كل صفحات اللوحة تمر من هنا: بدون دخول ترجع لصفحة الدخول
export default async function AdminPanelLayout({ children }) {
  await requireAdmin('/admin');
  return (
    <>
      {children}
      <AdminNav />
    </>
  );
}

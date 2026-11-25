import AdminNav from '@/components/admin/AdminNav';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';

// كل صفحات اللوحة تمر من هنا: بدون دخول ترجع لصفحة الدخول
export default async function AdminPanelLayout({ children }) {
  const { accessToken } = await requireAdmin('/admin');
  // عدد الطلبات الجديدة (يطلع رقم على خانة الطلبات)
  const fresh = await adminSelect('submissions?select=id&status=eq.new', accessToken).catch(() => []);
  return (
    <>
      {children}
      <AdminNav requests={fresh.length} />
    </>
  );
}

import AdminHeader from '@/components/admin/AdminHeader';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'المدن' };

export default async function CitiesPage() {
  await requireAdmin('/admin/cities');
  return (
    <main className="admin-page">
      <AdminHeader title="المدن الظاهرة للعملاء" />
      <div className="admin-body">
        <p className="empty">شاشة المدن نبنيها في جزء جاي.</p>
      </div>
    </main>
  );
}

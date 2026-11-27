import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import Reports from '@/components/admin/Reports';
import { getReport } from '@/lib/admin/reports';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'التقارير' };

export default async function ReportsPage() {
  const { accessToken } = await requireAdmin('/admin/reports');
  const report = await getReport(accessToken);
  return (
    <main className="admin-page reports-page">
      <AdminHeader
        title="التقارير"
        action={
          <Link href="/admin" className="btn btn--outline no-print">
            رجوع
          </Link>
        }
      />
      <Reports report={report} />
    </main>
  );
}

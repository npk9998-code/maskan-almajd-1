import AdminHeader from '@/components/admin/AdminHeader';
import RequestsList from '@/components/admin/RequestsList';
import { adminSelect } from '@/lib/admin/api';
import { REQUEST_COLUMNS, toRequest } from '@/lib/admin/requests';
import { requireAdmin } from '@/lib/admin/session';
import { getSiteUrl } from '@/lib/site';

export const metadata = { title: 'الطلبات' };

export default async function RequestsPage() {
  const { accessToken } = await requireAdmin('/admin/requests');
  const rows = await adminSelect(`submissions?select=${REQUEST_COLUMNS}&status=eq.new&order=created_at.desc`, accessToken);
  return (
    <main className="admin-page">
      <AdminHeader title="الطلبات" />
      <RequestsList requests={rows.map(toRequest)} submitUrl={`${getSiteUrl()}/submit`} />
    </main>
  );
}

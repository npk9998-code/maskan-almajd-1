import NewCityForm from '@/components/admin/NewCityForm';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'إضافة مدينة' };

export default async function NewCityPage() {
  const { accessToken } = await requireAdmin('/admin/cities/new');
  const regions = await adminSelect('regions?select=name&order=id.asc', accessToken).catch(() => []);
  return <NewCityForm regions={regions.map((r) => r.name)} />;
}

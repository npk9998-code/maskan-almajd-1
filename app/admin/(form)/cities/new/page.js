import NewCityForm from '@/components/admin/NewCityForm';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'إضافة مدينة' };

export default async function NewCityPage() {
  await requireAdmin('/admin/cities/new');
  return <NewCityForm />;
}

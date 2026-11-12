import OfferForm from '@/components/admin/OfferForm';
import { getLocations } from '@/lib/admin/form-data';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'إضافة عرض' };

export default async function NewOfferPage() {
  const { accessToken } = await requireAdmin('/admin/new');
  const { cities, districts } = await getLocations(accessToken);
  return <OfferForm cities={cities} districts={districts} />;
}

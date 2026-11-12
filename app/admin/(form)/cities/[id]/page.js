import { notFound } from 'next/navigation';
import CityDistricts from '@/components/admin/CityDistricts';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'أحياء المدينة' };

export default async function CityPage({ params }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const { accessToken } = await requireAdmin(`/admin/cities/${id}`);
  const rows = await adminSelect(
    `cities?select=id,name,is_visible,districts(id,name,direction,listings(count))&id=eq.${id}&limit=1`,
    accessToken,
  );
  const city = rows[0];
  if (!city) notFound();

  const districts = (city.districts ?? [])
    .map((d) => ({ id: d.id, name: d.name, direction: d.direction, listings: d.listings?.[0]?.count ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return <CityDistricts city={{ id: city.id, name: city.name, visible: city.is_visible }} districts={districts} />;
}

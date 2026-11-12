import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import CitiesList from '@/components/admin/CitiesList';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';

export const metadata = { title: 'المدن' };

export default async function CitiesPage() {
  const { accessToken } = await requireAdmin('/admin/cities');
  const [rows, listings] = await Promise.all([
    adminSelect('cities?select=id,name,is_visible,sort_order,districts(count)&order=sort_order.asc,name.asc', accessToken),
    adminSelect('listings?select=status,district:districts(city_id)', accessToken),
  ]);

  // عدد العروض في كل مدينة
  const offerCounts = new Map();
  for (const l of listings) {
    const cityId = l.district?.city_id;
    if (cityId == null) continue;
    const c = offerCounts.get(cityId) ?? { total: 0, available: 0 };
    c.total += 1;
    if (l.status === 'available') c.available += 1;
    offerCounts.set(cityId, c);
  }

  const cities = rows.map((c) => ({
    id: c.id,
    name: c.name,
    visible: c.is_visible,
    districtCount: c.districts?.[0]?.count ?? 0,
    offers: offerCounts.get(c.id) ?? { total: 0, available: 0 },
  }));

  return (
    <main className="admin-page">
      <AdminHeader title="المدن الظاهرة للعملاء" />
      <div className="admin-body">
        <p className="admin-info">
          المدينة اللي تشغّلها تطلع في قائمة المدن بصفحة العروض. واللي تطفيها تختفي هي وعروضها من الموقع،
          والعروض تبقى محفوظة عندك.
        </p>
        <CitiesList cities={cities} />
        <Link href="/admin/cities/new" className="add-city">
          <span aria-hidden="true">+</span> إضافة مدينة
        </Link>
      </div>
    </main>
  );
}

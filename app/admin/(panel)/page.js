import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import MyOffers from '@/components/admin/MyOffers';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';
import { getStorageUsage, purgeExpired } from '@/lib/admin/trash';
import { getSiteUrl } from '@/lib/site';
import { imageUrl } from '@/lib/supabase';

export const metadata = { title: 'عروضي' };

const COLUMNS = [
  'id',
  'property_type',
  'custom_type',
  'price',
  'price_display',
  'show_price_per_meter',
  'area',
  'rooms',
  'bathrooms',
  'property_age_years',
  'facade',
  'street_width',
  'floor',
  'features',
  'status',
  'created_at',
  'district:districts(name,direction,city:cities(name))',
  'note:private_notes(notes)',
  'images:listing_images(image_path,thumb_path,sort_order)',
  'stats:listing_stats(unique_views,total_views,whatsapp_clicks)',
].join(',');

function toRow(r) {
  const first = [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const stats = (Array.isArray(r.stats) ? r.stats[0] : r.stats) ?? {};
  const num = (v) => (v == null ? null : Number(v));
  return {
    id: r.id,
    type: r.property_type,
    customType: r.custom_type,
    price: r.price == null ? null : Number(r.price),
    priceDisplay: r.price_display,
    showPricePerMeter: Boolean(r.show_price_per_meter),
    area: num(r.area),
    rooms: r.rooms,
    bathrooms: r.bathrooms,
    ageYears: r.property_age_years,
    facade: r.facade,
    streetWidth: num(r.street_width),
    floor: r.floor,
    features: r.features ?? [],
    status: r.status,
    stats: {
      people: stats.unique_views ?? 0,
      views: stats.total_views ?? 0,
      whatsapp: stats.whatsapp_clicks ?? 0,
    },
    createdAt: r.created_at,
    direction: r.district?.direction ?? null,
    notes: (Array.isArray(r.note) ? r.note[0]?.notes : r.note?.notes) ?? '',
    district: r.district?.name ?? '',
    city: r.district?.city?.name ?? '',
    thumb: first ? imageUrl(first.thumb_path ?? first.image_path) : null,
  };
}

export default async function MyOffersPage({ searchParams } = {}) {
  const { f } = (await searchParams) ?? {};
  const { accessToken } = await requireAdmin('/admin');
  // تنظيف السلة القديمة (العروض بعد ٣٠ يوم والطلبات المرفوضة بعد ٧) قبل ما نقرا العروض
  await purgeExpired(accessToken).catch(() => {});
  const [rows, trash, storage] = await Promise.all([
    adminSelect(`listings?select=${COLUMNS}&deleted_at=is.null&order=created_at.desc`, accessToken),
    adminSelect('listings?select=id&deleted_at=not.is.null', accessToken).catch(() => []),
    getStorageUsage(accessToken).catch(() => null),
  ]);

  return (
    <main className="admin-page">
      <AdminHeader
        title="عروضي"
        action={
          <Link href="/admin/new" className="btn btn--primary admin-add" data-tour="admin-add">
            <span aria-hidden="true">+</span> إضافة عرض
          </Link>
        }
      />
      <MyOffers offers={rows.map(toRow)} siteUrl={getSiteUrl()} storage={storage} trashCount={trash.length} initialFilter={f === 'pending' ? 'pending' : 'all'} />
    </main>
  );
}

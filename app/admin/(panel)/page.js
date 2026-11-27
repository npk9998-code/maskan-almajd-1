import Link from 'next/link';
import { ChartIcon, HeartIcon } from '@/components/Icons';
import AdminHeader from '@/components/admin/AdminHeader';
import MyOffers from '@/components/admin/MyOffers';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';
import { getStorageUsage, purgeExpired } from '@/lib/admin/trash';
import { getSiteUrl, getWhatsAppNumber } from '@/lib/site';
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
  'is_featured',
  'admin_favorite',
  'previous_price',
  'price_dropped_at',
  'district:districts(name,direction,city:cities(name))',
  'note:private_notes(notes,owner_name,owner_phone)',
  'images:listing_images(image_path,thumb_path,sort_order)',
  'stats:listing_stats(unique_views,total_views,whatsapp_clicks)',
].join(',');

function toRow(r) {
  const first = [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const stats = (Array.isArray(r.stats) ? r.stats[0] : r.stats) ?? {};
  const num = (v) => (v == null ? null : Number(v));
  const note = Array.isArray(r.note) ? r.note[0] : r.note;
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
    notes: note?.notes ?? '',
    ownerName: note?.owner_name ?? '',
    ownerPhone: note?.owner_phone ?? '',
    featured: Boolean(r.is_featured),
    favorite: Boolean(r.admin_favorite),
    previousPrice: num(r.previous_price),
    priceDropped:
      r.previous_price != null && r.price != null && Number(r.previous_price) > Number(r.price) && r.price_dropped_at != null &&
      Date.now() - new Date(r.price_dropped_at).getTime() < 7 * 86_400_000,
    images: [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((img) => ({ full: imageUrl(img.image_path) })),
    district: r.district?.name ?? '',
    city: r.district?.city?.name ?? '',
    thumb: first ? imageUrl(first.thumb_path ?? first.image_path) : null,
  };
}

export default async function MyOffersPage({ searchParams } = {}) {
  const { f, fav } = (await searchParams) ?? {};
  const showFav = fav === '1';
  const { accessToken } = await requireAdmin('/admin');
  // تنظيف السلة القديمة (العروض بعد ٣٠ يوم والطلبات المرفوضة بعد ٧) قبل ما نقرا العروض
  await purgeExpired(accessToken).catch(() => {});
  const [rows, trash, storage] = await Promise.all([
    adminSelect(`listings?select=${COLUMNS}&deleted_at=is.null&order=created_at.desc`, accessToken),
    adminSelect('listings?select=id&deleted_at=not.is.null', accessToken).catch(() => []),
    getStorageUsage(accessToken).catch(() => null),
  ]);

  const offers = rows.map(toRow);
  const favCount = offers.filter((o) => o.favorite).length;

  return (
    <main className="admin-page">
      <AdminHeader
        title={showFav ? 'المفضلة' : 'عروضي'}
        lead={
          <Link href="/admin/reports" className="btn btn--outline btn--icon" aria-label="التقارير" title="التقارير" data-tour="reports">
            <ChartIcon />
          </Link>
        }
        action={
          <>
            <Link
              href={showFav ? '/admin' : '/admin?fav=1'}
              className={showFav ? 'btn btn--icon admin-fav is-active' : 'btn btn--outline btn--icon admin-fav'}
              aria-label={showFav ? 'كل العروض' : `المفضلة (${favCount})`}
              aria-pressed={showFav}
              data-tour="admin-fav"
            >
              <HeartIcon />
              {favCount ? <span className="admin-fav__count tabular">{favCount}</span> : null}
            </Link>
            <Link href="/admin/new" className="btn btn--primary admin-add" data-tour="admin-add">
              <span aria-hidden="true">+</span> إضافة عرض
            </Link>
          </>
        }
      />
      <MyOffers
        offers={offers}
        siteUrl={getSiteUrl()}
        whatsappNumber={getWhatsAppNumber()}
        storage={storage}
        trashCount={trash.length}
        initialFilter={f === 'pending' ? 'pending' : f === 'featured' ? 'featured' : 'available'}
        favoritesOnly={showFav}
      />
    </main>
  );
}

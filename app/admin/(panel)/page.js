import AdminHeader from '@/components/admin/AdminHeader';
import MyOffers from '@/components/admin/MyOffers';
import { adminSelect } from '@/lib/admin/api';
import { requireAdmin } from '@/lib/admin/session';
import { imageUrl } from '@/lib/supabase';

export const metadata = { title: 'عروضي' };

const COLUMNS = [
  'id',
  'property_type',
  'price',
  'price_display',
  'status',
  'created_at',
  'district:districts(name,city:cities(name))',
  'images:listing_images(image_path,thumb_path,sort_order)',
].join(',');

function toRow(r) {
  const first = [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: r.id,
    type: r.property_type,
    price: r.price == null ? null : Number(r.price),
    priceDisplay: r.price_display,
    status: r.status,
    district: r.district?.name ?? '',
    city: r.district?.city?.name ?? '',
    thumb: first ? imageUrl(first.thumb_path ?? first.image_path) : null,
  };
}

export default async function MyOffersPage() {
  const { accessToken } = await requireAdmin('/admin');
  const rows = await adminSelect(`listings?select=${COLUMNS}&order=created_at.desc`, accessToken);

  return (
    <main className="admin-page">
      <AdminHeader
        title="عروضي"
        action={
          <button type="button" className="btn btn--primary admin-add" title="نشغلها في الجزء الجاي">
            <span aria-hidden="true">+</span> إضافة عرض
          </button>
        }
      />
      <MyOffers offers={rows.map(toRow)} />
    </main>
  );
}

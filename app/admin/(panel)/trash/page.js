import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import TrashList from '@/components/admin/TrashList';
import { adminSelect } from '@/lib/admin/api';
import { REQUEST_COLUMNS, toRequest } from '@/lib/admin/requests';
import { requireAdmin } from '@/lib/admin/session';
import { OFFER_TRASH_DAYS, REQUEST_TRASH_DAYS } from '@/lib/admin/trash';
import { imageUrl } from '@/lib/supabase';

export const metadata = { title: 'سلة المحذوفات' };

const COLUMNS =
  'id,property_type,custom_type,price,price_display,area,deleted_at,district:districts(name,city:cities(name)),images:listing_images(image_path,thumb_path,sort_order)';

export default async function TrashPage() {
  const { accessToken } = await requireAdmin('/admin/trash');
  const [offers, requests] = await Promise.all([
    adminSelect(`listings?select=${COLUMNS}&deleted_at=not.is.null&order=deleted_at.desc`, accessToken),
    adminSelect(`submissions?select=${REQUEST_COLUMNS}&status=eq.rejected&order=rejected_at.desc`, accessToken),
  ]);
  const offerRows = offers.map((r) => {
    const first = [...(r.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: r.id,
      type: r.property_type,
      customType: r.custom_type,
      price: r.price == null ? null : Number(r.price),
      priceDisplay: r.price_display,
      area: r.area == null ? null : Number(r.area),
      district: r.district?.name ?? '',
      city: r.district?.city?.name ?? '',
      deletedAt: r.deleted_at,
      thumb: first ? imageUrl(first.thumb_path ?? first.image_path) : null,
    };
  });

  return (
    <main className="admin-page">
      <AdminHeader
        title="سلة المحذوفات"
        action={
          <Link href="/admin" className="btn btn--outline">
            رجوع لعروضي
          </Link>
        }
      />
      <TrashList
        offers={offerRows}
        requests={requests.map(toRequest)}
        offerDays={OFFER_TRASH_DAYS}
        requestDays={REQUEST_TRASH_DAYS}
      />
    </main>
  );
}

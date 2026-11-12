import { notFound } from 'next/navigation';
import OfferForm from '@/components/admin/OfferForm';
import { adminSelect } from '@/lib/admin/api';
import { getLocations } from '@/lib/admin/form-data';
import { requireAdmin } from '@/lib/admin/session';
import { imageUrl } from '@/lib/supabase';

export const metadata = { title: 'تعديل العرض' };

const COLUMNS =
  'id,property_type,district_id,price,price_display,area,rooms,bathrooms,property_age_years,facade,street_width,floor,features,description,ad_license_number,status,district:districts(city_id),images:listing_images(image_path,thumb_path,sort_order),note:private_notes(notes)';

export default async function EditOfferPage({ params }) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const { accessToken } = await requireAdmin(`/admin/offers/${id}/edit`);

  const [rows, { cities, districts }] = await Promise.all([
    adminSelect(`listings?select=${COLUMNS}&id=eq.${id}&limit=1`, accessToken),
    getLocations(accessToken),
  ]);
  const r = rows[0];
  if (!r) notFound();

  const note = Array.isArray(r.note) ? r.note[0]?.notes : r.note?.notes;
  const initial = {
    id: r.id,
    type: r.property_type,
    cityId: r.district?.city_id ?? '',
    districtId: r.district_id,
    price: r.price == null ? '' : String(Math.round(Number(r.price))),
    priceDisplay: r.price_display,
    area: r.area == null ? '' : String(Number(r.area)),
    rooms: r.rooms ?? '',
    bathrooms: r.bathrooms ?? '',
    ageYears: r.property_age_years ?? '',
    facade: r.facade ?? '',
    streetWidth: r.street_width == null ? '' : String(Number(r.street_width)),
    floor: r.floor ?? '',
    features: r.features ?? [],
    description: r.description ?? '',
    adLicense: r.ad_license_number ?? '',
    notes: note ?? '',
    status: r.status,
    images: [...(r.images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        image_path: img.image_path,
        thumb_path: img.thumb_path,
        preview: imageUrl(img.thumb_path ?? img.image_path),
        saved: true,
      })),
  };

  return <OfferForm cities={cities} districts={districts} initial={initial} />;
}

import { cache } from 'react';
import { imageUrl, selectRows } from '@/lib/supabase';

// الأعمدة العامة فقط. لاحظ:
// - السعر الأصلي (price) ما نطلبه أبداً، نطلب public_price اللي يصير فاضي إذا السعر مخفي
// - الملاحظات الخاصة في جدول منفصل ما نقراه هنا، والزائر أصلاً ما عنده صلاحية عليه
// - العروض المخفية والمدن المطفية تمنعها قواعد الحماية (RLS) من قاعدة البيانات نفسها
const PUBLIC_COLUMNS = [
  'id',
  'property_type',
  'custom_type',
  'price_display',
  'show_price_per_meter',
  'public_price',
  'area',
  'rooms',
  'bathrooms',
  'property_age_years',
  'facade',
  'street_width',
  'floor',
  'features',
  'description',
  'ad_license_number',
  'status',
  'created_at',
  'district:districts(name,direction,city:cities(name))',
  'images:listing_images(image_path,thumb_path,sort_order)',
].join(',');

function toOffer(row) {
  const images = [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id,
    type: row.property_type,
    customType: row.custom_type ?? null,
    city: row.district?.city?.name ?? '',
    district: row.district?.name ?? '',
    direction: row.district?.direction ?? null,
    price: row.public_price == null ? null : Number(row.public_price),
    priceDisplay: row.price_display,
    showPricePerMeter: Boolean(row.show_price_per_meter),
    area: row.area == null ? null : Number(row.area),
    rooms: row.rooms,
    bathrooms: row.bathrooms,
    ageYears: row.property_age_years,
    facade: row.facade,
    streetWidth: row.street_width == null ? null : Number(row.street_width),
    floor: row.floor,
    features: row.features ?? [],
    description: row.description,
    adLicense: row.ad_license_number,
    status: row.status,
    createdAt: row.created_at,
    images: images.map((img) => ({
      full: imageUrl(img.image_path),
      thumb: imageUrl(img.thumb_path ?? img.image_path),
    })),
  };
}

// كل العروض الظاهرة (المعروضة والمباعة) — الأحدث أولاً
export const getPublicOffers = cache(async () => {
  const rows = await selectRows(`listings?select=${PUBLIC_COLUMNS}&order=created_at.desc`);
  return rows.filter((r) => r.district?.city).map(toOffer);
});

export const getPublicOffer = cache(async (id) => {
  if (!/^\d{1,9}$/.test(String(id))) return null;
  const rows = await selectRows(`listings?select=${PUBLIC_COLUMNS}&id=eq.${id}&limit=1`);
  const row = rows[0];
  return row?.district?.city ? toOffer(row) : null;
});

// المدن الظاهرة بس (قواعد الحماية تخفي المطفية)
export const getVisibleCities = cache(async () => {
  const rows = await selectRows('cities?select=name&order=sort_order.asc,name.asc');
  return rows.map((r) => r.name);
});

// تجهيز طلبات العملاء للعرض في لوحة التحكم (السيرفر بس)
import { imageUrl } from '@/lib/supabase';

export const REQUEST_COLUMNS =
  'id,created_at,status,rejected_at,owner_name,owner_phone,property_type,custom_type,city,district,area,price,rooms,bathrooms,property_age_years,facade,street_width,floor,description,deed_number,images,consent_at';

const num = (v) => (v == null ? null : Number(v));

export function toRequest(r) {
  const images = Array.isArray(r.images) ? r.images : [];
  return {
    id: r.id,
    createdAt: r.created_at,
    rejectedAt: r.rejected_at,
    name: r.owner_name,
    phone: r.owner_phone,
    type: r.property_type,
    customType: r.custom_type,
    city: r.city,
    district: r.district,
    area: num(r.area),
    price: num(r.price),
    rooms: r.rooms,
    bathrooms: r.bathrooms,
    ageYears: r.property_age_years,
    facade: r.facade,
    streetWidth: num(r.street_width),
    floor: r.floor,
    description: r.description,
    deed: r.deed_number,
    consentAt: r.consent_at,
    images: images.map((img) => ({ thumb: imageUrl(img.thumb_path), full: imageUrl(img.image_path) })),
  };
}

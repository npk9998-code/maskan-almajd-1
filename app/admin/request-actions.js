'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDelete, adminInsert, adminSelect, adminUpdate, storageRemove } from '@/lib/admin/api';
import { getActionToken } from '@/lib/admin/session';
import { normalizeArabic } from '@/lib/format';

async function requireToken() {
  const token = await getActionToken();
  if (!token) redirect('/admin/login');
  return token;
}

const toInt = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

function refresh() {
  revalidatePath('/admin', 'layout');
}

const dateText = (iso) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(
    new Date(iso),
  );

// قبول: يصير عرض "بانتظار النشر" وبيانات المالك تنحفظ في الملاحظات الخاصة
export async function acceptRequest(id) {
  const token = await requireToken();
  const reqId = toInt(id);
  if (!reqId) return { ok: false, message: 'طلب غير صحيح' };

  let newDistrict = null;
  let listingId;
  try {
    const [r] = await adminSelect(`submissions?id=eq.${reqId}&limit=1`, token);
    if (!r) return { ok: false, message: 'الطلب غير موجود' };

    const [city] = await adminSelect(`cities?select=id&name=eq.${encodeURIComponent(r.city)}&limit=1`, token);
    if (!city) return { ok: false, message: `مدينة ${r.city} غير موجودة في صفحة المدن` };

    const districts = await adminSelect(`districts?select=id,name&city_id=eq.${city.id}`, token);
    const key = normalizeArabic(r.district);
    let district = districts.find((d) => normalizeArabic(d.name) === key);
    if (!district) {
      [district] = await adminInsert('districts?select=id,name', { city_id: city.id, name: r.district, direction: 'center' }, token);
      newDistrict = r.district;
    }

    const type = r.property_type;
    const isLand = type === 'land';
    const isApartment = type === 'apartment';
    const price = r.price == null ? null : Number(r.price);
    const [listing] = await adminInsert(
      'listings?select=id',
      {
        property_type: type,
        custom_type: type === 'other' ? r.custom_type || 'أخرى' : null,
        district_id: district.id,
        price,
        price_display: price ? 'show' : 'hidden',
        area: r.area,
        rooms: isLand ? null : r.rooms,
        bathrooms: isLand ? null : r.bathrooms,
        property_age_years: isLand ? null : r.property_age_years,
        facade: r.facade,
        street_width: isApartment ? null : r.street_width,
        floor: isApartment || type === 'other' ? r.floor : null,
        description: r.description,
        status: 'pending',
      },
      token,
    );
    listingId = listing.id;

    const images = (Array.isArray(r.images) ? r.images : []).map((img, i) => ({
      listing_id: listingId,
      image_path: img.image_path,
      thumb_path: img.thumb_path,
      sort_order: i,
    }));
    if (images.length) await adminInsert('listing_images', images, token);

    const notes = [
      `من طلب عميل رقم ${r.id}`,
      `المالك: ${r.owner_name} · ${r.owner_phone}`,
      r.deed_number ? `رقم الصك: ${r.deed_number}` : null,
      `وافق مبدئياً على عقد الوساطة: ${dateText(r.consent_at)}`,
      newDistrict ? `الحي "${newDistrict}" انضاف جديد بموقع (الوسط)، عدّله من صفحة المدن` : null,
    ]
      .filter(Boolean)
      .join('\n');
    await adminInsert('private_notes', { listing_id: listingId, notes }, token, { upsertOn: 'listing_id' });

    await adminDelete(`submissions?id=eq.${reqId}`, token);
  } catch {
    return { ok: false, message: 'صار خطأ وما انقبل الطلب، جرّب مرة ثانية' };
  }
  refresh();
  return {
    ok: true,
    message: newDistrict
      ? `انتقل لـ«بانتظار النشر». وأضفت حي ${newDistrict} بموقع (الوسط)، عدّله من المدن`
      : 'انتقل لـ«بانتظار النشر» في عروضي',
  };
}

// رفض: يروح للسلة ٧ أيام
export async function rejectRequest(id) {
  const token = await requireToken();
  const reqId = toInt(id);
  if (!reqId) return { ok: false, message: 'طلب غير صحيح' };
  try {
    await adminUpdate(`submissions?id=eq.${reqId}&select=id`, { status: 'rejected', rejected_at: new Date().toISOString() }, token);
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  refresh();
  return { ok: true };
}

export async function restoreRequest(id) {
  const token = await requireToken();
  const reqId = toInt(id);
  if (!reqId) return { ok: false, message: 'طلب غير صحيح' };
  try {
    await adminUpdate(`submissions?id=eq.${reqId}&select=id`, { status: 'new', rejected_at: null }, token);
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  refresh();
  return { ok: true };
}

export async function purgeRequest(id) {
  const token = await requireToken();
  const reqId = toInt(id);
  if (!reqId) return { ok: false, message: 'طلب غير صحيح' };
  try {
    const [r] = await adminSelect(`submissions?select=images&id=eq.${reqId}&status=eq.rejected&limit=1`, token);
    if (!r) return { ok: false, message: 'الطلب غير موجود' };
    await adminDelete(`submissions?id=eq.${reqId}`, token);
    await storageRemove(
      (Array.isArray(r.images) ? r.images : []).flatMap((img) => [img.image_path, img.thumb_path]),
      token,
    ).catch(() => {});
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  refresh();
  return { ok: true };
}

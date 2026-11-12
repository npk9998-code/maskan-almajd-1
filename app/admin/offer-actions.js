'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDelete, adminInsert, adminSelect, adminUpdate, storageRemove, storageUpload } from '@/lib/admin/api';
import { getActionToken } from '@/lib/admin/session';

const MAX_UPLOAD_BYTES = 950 * 1024;
const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const TYPES = new Set(['villa', 'apartment', 'land']);
const PRICE_DISPLAYS = new Set(['show', 'negotiable', 'hidden']);
const STATUSES = new Set(['available', 'hidden', 'sold']);

async function requireToken() {
  const token = await getActionToken();
  if (!token) redirect('/admin/login');
  return token;
}

function revalidateOffer(id) {
  revalidatePath('/');
  revalidatePath('/admin');
  if (id) revalidatePath(`/offers/${id}`);
}

// ===== رفع صورة وحدة (نسخة كبيرة + نسخة صغيرة) =====
export async function uploadOfferImage(formData) {
  const token = await requireToken();
  const full = formData.get('full');
  const thumb = formData.get('thumb');
  for (const blob of [full, thumb]) {
    if (!(blob instanceof Blob) || !IMAGE_TYPES[blob.type] || blob.size > MAX_UPLOAD_BYTES) {
      return { ok: false, message: 'الصورة كبيرة أو نوعها غير مدعوم' };
    }
  }
  const now = new Date();
  const folder = `offers/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = crypto.randomUUID();
  const fullPath = `${folder}/${key}.${IMAGE_TYPES[full.type]}`;
  const thumbPath = `${folder}/${key}-thumb.${IMAGE_TYPES[thumb.type]}`;
  try {
    await Promise.all([
      storageUpload(fullPath, Buffer.from(await full.arrayBuffer()), full.type, token),
      storageUpload(thumbPath, Buffer.from(await thumb.arrayBuffer()), thumb.type, token),
    ]);
  } catch {
    return { ok: false, message: 'ما قدرت أرفع الصورة، جرّب مرة ثانية' };
  }
  return { ok: true, image: { image_path: fullPath, thumb_path: thumbPath } };
}

// حذف صور انرفعت وما انحفظت (لما تحذفها قبل الحفظ)
export async function discardUploads(paths) {
  const token = await requireToken();
  if (!Array.isArray(paths)) return;
  await storageRemove(paths.filter((p) => typeof p === 'string' && p.startsWith('offers/')), token).catch(() => {});
}

// ===== تنظيف وفحص البيانات =====
const toNumber = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const toInt = (v) => {
  const n = toNumber(v);
  return n == null ? null : Math.round(n);
};
const toText = (v, max) => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t.slice(0, max) : null;
};

function buildRow(input) {
  const errors = {};
  if (!TYPES.has(input.type)) errors.type = 'اختر نوع العقار';
  const districtId = toInt(input.districtId);
  if (!input.cityId) errors.city = 'اختر المدينة';
  if (!districtId) errors.district = 'اختر الحي';
  const area = toNumber(input.area);
  if (!area || area <= 0) errors.area = 'اكتب المساحة';

  const priceDisplay = PRICE_DISPLAYS.has(input.priceDisplay) ? input.priceDisplay : 'show';
  const price = toNumber(input.price);
  if (priceDisplay !== 'hidden' && !price) errors.price = 'اكتب السعر، أو اختر "إخفاء السعر"';

  const status = STATUSES.has(input.status) ? input.status : 'available';
  const isLand = input.type === 'land';
  const isApartment = input.type === 'apartment';

  const features = Array.isArray(input.features)
    ? [...new Set(input.features.map((f) => String(f).trim()).filter(Boolean))].slice(0, 30).map((f) => f.slice(0, 40))
    : [];

  return {
    errors,
    row: {
      property_type: input.type,
      district_id: districtId,
      price,
      price_display: priceDisplay,
      area,
      rooms: isLand ? null : toInt(input.rooms),
      bathrooms: isLand ? null : toInt(input.bathrooms),
      property_age_years: isLand ? null : toInt(input.ageYears),
      facade: toText(input.facade, 40),
      street_width: isApartment ? null : toNumber(input.streetWidth),
      floor: isApartment ? toInt(input.floor) : null,
      features,
      description: toText(input.description, 1000),
      ad_license_number: toText(input.adLicense, 40),
      status,
    },
  };
}

function cleanImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => img && typeof img.image_path === 'string')
    .slice(0, 20)
    .map((img, i) => ({
      image_path: img.image_path,
      thumb_path: typeof img.thumb_path === 'string' ? img.thumb_path : null,
      sort_order: i,
    }));
}

// ===== حفظ (إضافة أو تعديل) =====
export async function saveOffer(input) {
  const token = await requireToken();
  const { errors, row } = buildRow(input ?? {});
  if (Object.keys(errors).length) return { ok: false, errors, message: 'كمّل الحقول المطلوبة' };

  const editingId = toInt(input.id);
  let id = editingId;
  try {
    if (editingId) {
      const updated = await adminUpdate(`listings?id=eq.${editingId}&select=id`, row, token);
      if (!updated?.length) return { ok: false, message: 'العرض غير موجود' };
    } else {
      const created = await adminInsert('listings?select=id', row, token);
      id = created[0].id;
    }

    // الصور بالترتيب الجديد
    await adminDelete(`listing_images?listing_id=eq.${id}`, token);
    const images = cleanImages(input.images);
    if (images.length) {
      await adminInsert('listing_images', images.map((img) => ({ ...img, listing_id: id })), token);
    }

    // الملاحظات الخاصة
    const notes = toText(input.notes, 4000);
    if (notes) {
      await adminInsert('private_notes', { listing_id: id, notes }, token, { upsertOn: 'listing_id' });
    } else {
      await adminDelete(`private_notes?listing_id=eq.${id}`, token);
    }

    // حذف ملفات الصور اللي انشالت
    if (Array.isArray(input.removedPaths) && input.removedPaths.length) {
      await storageRemove(input.removedPaths, token).catch(() => {});
    }
  } catch {
    return { ok: false, message: 'صار خطأ وما انحفظ العرض، جرّب مرة ثانية' };
  }

  revalidateOffer(id);
  redirect('/admin');
}

// ===== حذف نهائي =====
export async function deleteOffer(id) {
  const token = await requireToken();
  const listingId = toInt(id);
  if (!listingId) return { ok: false, message: 'طلب غير صحيح' };
  try {
    const images = await adminSelect(`listing_images?listing_id=eq.${listingId}&select=image_path,thumb_path`, token);
    await adminDelete(`listings?id=eq.${listingId}`, token);
    await storageRemove(images.flatMap((img) => [img.image_path, img.thumb_path]), token).catch(() => {});
  } catch {
    return { ok: false, message: 'ما قدرت أحذف العرض، جرّب مرة ثانية' };
  }
  revalidateOffer(listingId);
  redirect('/admin');
}

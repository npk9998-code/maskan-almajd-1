'use server';

import { SUPABASE_KEY, SUPABASE_URL, assertConfig } from '@/lib/supabase';

const MAX_UPLOAD_BYTES = 950 * 1024;
const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const TYPES = new Set(['villa', 'apartment', 'land', 'other']);
const MIN_FILL_MS = 4000;

// نفس طريقة مكتبة Supabase الرسمية للتخزين
const anonHeaders = (extra) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...extra });

// رفع صورة من العميل (داخل مجلد submissions بس — قواعد الحماية تمنع غيره)
export async function uploadSubmissionImage(formData) {
  assertConfig();
  const full = formData.get('full');
  const thumb = formData.get('thumb');
  for (const blob of [full, thumb]) {
    if (!(blob instanceof Blob) || !IMAGE_TYPES[blob.type] || blob.size > MAX_UPLOAD_BYTES) {
      return { ok: false, message: 'الصورة كبيرة أو نوعها غير مدعوم' };
    }
  }
  const now = new Date();
  const folder = `submissions/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = crypto.randomUUID();
  const image = {
    image_path: `${folder}/${key}.${IMAGE_TYPES[full.type]}`,
    thumb_path: `${folder}/${key}-thumb.${IMAGE_TYPES[thumb.type]}`,
  };
  try {
    await Promise.all(
      [
        [image.image_path, full],
        [image.thumb_path, thumb],
      ].map(async ([path, blob]) => {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/listing-images/${path}`, {
          method: 'POST',
          headers: anonHeaders({ 'Content-Type': blob.type, 'cache-control': 'max-age=31536000', 'x-upsert': 'false' }),
          body: Buffer.from(await blob.arrayBuffer()),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Storage ${res.status}`);
      }),
    );
  } catch {
    return { ok: false, message: 'ما قدرنا نرفع إحدى الصور، جرّب مرة ثانية' };
  }
  return { ok: true, image };
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = (v) => {
  const s = String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d.]/g, '');
  return s && Number.isFinite(Number(s)) ? s : '';
};

// إرسال الطلب
export async function submitProperty(input) {
  assertConfig();
  if (!input || typeof input !== 'object') return { ok: false, message: 'طلب غير صحيح' };
  // فخ للبرامج الآلية: خانة مخفية لازم تبقى فاضية، والتعبئة تاخذ وقت
  if (input.website || !(Number(input.elapsed) >= MIN_FILL_MS)) {
    return { ok: true };
  }

  const errors = {};
  const name = text(input.name, 60);
  const phone = digits(input.phone);
  const type = TYPES.has(input.type) ? input.type : '';
  const customType = type === 'other' ? text(input.customType, 40) : '';
  const city = text(input.city, 40);
  const district = text(input.district, 60).replace(/^حي\s+/, '');
  const area = digits(input.area);
  if (name.length < 2) errors.name = 'اكتب اسمك';
  if (!/^05\d{8}$/.test(phone)) errors.phone = 'رقم الجوال لازم يبدأ بـ05 ومن 10 أرقام';
  if (!type) errors.type = 'اختر نوع العقار';
  if (type === 'other' && !customType) errors.customType = 'اكتب نوع العقار';
  if (!city) errors.city = 'اختر المدينة';
  if (district.length < 2) errors.district = 'اكتب الحي';
  if (!area || Number(area) <= 0) errors.area = 'اكتب المساحة';
  if (!input.consent) errors.consent = 'لازم توافق عشان نقدر نستلم الطلب';
  if (Object.keys(errors).length) return { ok: false, errors, message: 'كمّل الخانات المطلوبة' };

  const isLand = type === 'land';
  const isApartment = type === 'apartment';
  const images = Array.isArray(input.images)
    ? input.images
        .filter((img) => img && typeof img.image_path === 'string' && typeof img.thumb_path === 'string')
        .slice(0, 10)
        .map((img) => ({ image_path: img.image_path, thumb_path: img.thumb_path }))
    : [];

  const payload = {
    owner_name: name,
    owner_phone: phone,
    device_id: text(input.deviceId, 64),
    property_type: type,
    custom_type: customType,
    city,
    district,
    area,
    price: digits(input.price),
    rooms: isLand ? '' : digits(input.rooms),
    bathrooms: isLand ? '' : digits(input.bathrooms),
    property_age_years: isLand ? '' : digits(input.ageYears),
    facade: text(input.facade, 40),
    street_width: isApartment ? '' : digits(input.streetWidth),
    floor: isApartment ? digits(input.floor) : '',
    description: text(input.description, 1000),
    deed_number: digits(input.deed).slice(0, 30),
    images,
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_property`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: payload }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes('limit')) {
        return { ok: false, message: 'وصلت الحد اليومي للطلبات (٣ طلبات). تواصل معنا على الواتساب لو تبي تضيف عقار ثاني.' };
      }
      if (body.includes('busy')) return { ok: false, message: 'فيه ضغط على الموقع الحين، جرّب بعد شوي' };
      if (body.includes('bad_city')) return { ok: false, errors: { city: 'اختر المدينة من القائمة' }, message: 'اختر المدينة من القائمة' };
      return { ok: false, message: 'صار خطأ وما انرسل الطلب، جرّب مرة ثانية' };
    }
  } catch {
    return { ok: false, message: 'صار خطأ في الاتصال، جرّب مرة ثانية' };
  }
  return { ok: true };
}

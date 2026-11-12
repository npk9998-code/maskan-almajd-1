// اتصال القراءة العامة بقاعدة البيانات (يشتغل في السيرفر بس)
// يستخدم المفتاح العام (Publishable) فقط — قواعد الحماية في Supabase هي اللي تحدد وش يشوف الزائر

const SUPABASE_URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

// كل كم ثانية تتحدث الصفحات من قاعدة البيانات
export const REVALIDATE_SECONDS = 60;

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'إعدادات Supabase ناقصة: أضف SUPABASE_URL و SUPABASE_PUBLISHABLE_KEY في Netlify > Project configuration > Environment variables',
    );
  }
}

export async function selectRows(pathAndQuery) {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// رابط الصورة: المسارات اللي تبدأ بـ / أو http تُستخدم مثل ما هي (للصور التجريبية)
export function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('/') || path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminUpdate, checkPin, signInWithPassword, signOut } from '@/lib/admin/api';
import { clearSession, getActionToken, saveSession } from '@/lib/admin/session';

const minutesLeft = (seconds) => Math.max(1, Math.ceil(seconds / 60));

export async function loginWithPin(pin) {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return { ok: false, message: 'اكتب ٦ أرقام' };
  }

  let result;
  try {
    result = await checkPin(pin);
  } catch {
    return { ok: false, message: 'صار خطأ في الاتصال، جرّب مرة ثانية' };
  }

  if (result?.locked) {
    return {
      ok: false,
      locked: true,
      message: `الدخول مقفول مؤقتاً. جرّب بعد ${minutesLeft(result.retry_after_seconds)} دقيقة`,
    };
  }
  if (!result?.ok) {
    return { ok: false, message: `الرمز غلط. باقي لك ${result?.remaining ?? 0} محاولات` };
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return { ok: false, message: 'إعدادات الدخول ناقصة في Netlify (ADMIN_EMAIL و ADMIN_PASSWORD)' };
  }

  const auth = await signInWithPassword(email, password);
  if (!auth.ok) {
    return { ok: false, message: 'الرمز صحيح، بس بيانات حساب المدير في Netlify غلط' };
  }

  await saveSession(auth.data);
  redirect('/admin');
}

export async function logout() {
  const token = await getActionToken();
  if (token) await signOut(token).catch(() => {});
  await clearSession();
  redirect('/admin/login');
}

// الحالات المسموحة من شاشة عروضي
const STATUSES = new Set(['available', 'hidden', 'sold']);

export async function setListingStatus(id, status) {
  const token = await getActionToken();
  if (!token) redirect('/admin/login');
  if (!Number.isInteger(id) || !STATUSES.has(status)) {
    return { ok: false, message: 'طلب غير صحيح' };
  }

  try {
    const rows = await adminUpdate(`listings?id=eq.${id}&select=id,status`, { status }, token);
    if (!rows?.length) return { ok: false, message: 'ما قدرت أعدّل العرض' };
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }

  // تحديث الموقع العام على طول
  revalidatePath('/');
  revalidatePath(`/offers/${id}`);
  revalidatePath('/admin');
  return { ok: true };
}

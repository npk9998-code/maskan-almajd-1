// جلسة المدير: التوكنات محفوظة في كوكيز httpOnly (ما يقدر يقراها أي كود في المتصفح)
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser, refreshSession } from '@/lib/admin/api';

const ACCESS_COOKIE = 'mz_admin_at';
const REFRESH_COOKIE = 'mz_admin_rt';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // تبقى داخل ٣٠ يوم على نفس الجهاز

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

const isFresh = (token) => token && tokenExpiresAt(token) - Date.now() > 30_000;

// يشتغل بس داخل Server Action أو Route Handler (لأنها تقدر تكتب كوكيز)
export async function saveSession(tokens) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access_token, { ...baseCookie, maxAge: tokens.expires_in ?? 3600 });
  store.set(REFRESH_COOKIE, tokens.refresh_token, { ...baseCookie, maxAge: REFRESH_MAX_AGE });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

async function readTokens() {
  const store = await cookies();
  return {
    access: store.get(ACCESS_COOKIE)?.value ?? null,
    refresh: store.get(REFRESH_COOKIE)?.value ?? null,
  };
}

async function verify(access) {
  const res = await getUser(access);
  if (!res.ok) return null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && res.data?.email?.toLowerCase() !== adminEmail) return null;
  return res.data;
}

// للصفحات: تتأكد من الجلسة مرة وحدة لكل طلب
export const getPageSession = cache(async () => {
  const { access, refresh } = await readTokens();
  if (isFresh(access)) {
    const user = await verify(access);
    if (user) return { status: 'ok', accessToken: access, user };
  }
  if (refresh) return { status: 'refresh' };
  return { status: 'none' };
});

// أي صفحة تحت /admin تنادي هذي: بدون دخول = ترجع لصفحة الدخول
export async function requireAdmin(next = '/admin') {
  const session = await getPageSession();
  if (session.status === 'ok') return session;
  if (session.status === 'refresh') redirect(`/admin/refresh?next=${encodeURIComponent(next)}`);
  redirect('/admin/login');
}

// للأكشنز وRoute Handlers: يجدد التوكن لو انتهى
export async function getActionToken() {
  const { access, refresh } = await readTokens();
  if (isFresh(access) && (await verify(access))) return access;
  if (!refresh) return null;
  const res = await refreshSession(refresh);
  if (!res.ok) {
    await clearSession();
    return null;
  }
  if (!(await verify(res.data.access_token))) {
    await clearSession();
    return null;
  }
  await saveSession(res.data);
  return res.data.access_token;
}

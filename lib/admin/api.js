// طلبات لوحة التحكم إلى Supabase (السيرفر بس)
import { SUPABASE_KEY, SUPABASE_URL, assertConfig } from '@/lib/supabase';

async function request(path, { method = 'GET', token, body, prefer } = {}) {
  assertConfig();
  const headers = { apikey: SUPABASE_KEY, Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

// فحص الرمز السري وقفل المحاولات — كله داخل قاعدة البيانات
export async function checkPin(pin) {
  const res = await request('/rest/v1/rpc/admin_check_pin', { method: 'POST', body: { p_pin: pin } });
  if (!res.ok) throw new Error(`admin_check_pin ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

export function signInWithPassword(email, password) {
  return request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
}

export function refreshSession(refreshToken) {
  return request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}

export function getUser(token) {
  return request('/auth/v1/user', { token });
}

export function signOut(token) {
  return request('/auth/v1/logout', { method: 'POST', token, body: {} });
}

export async function adminSelect(pathAndQuery, token) {
  const res = await request(`/rest/v1/${pathAndQuery}`, { token });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

export async function adminUpdate(pathAndQuery, body, token) {
  const res = await request(`/rest/v1/${pathAndQuery}`, {
    method: 'PATCH',
    token,
    body,
    prefer: 'return=representation',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

export async function adminInsert(table, rows, token, { upsertOn } = {}) {
  const query = upsertOn ? `?on_conflict=${upsertOn}` : '';
  const res = await request(`/rest/v1/${table}${query}`, {
    method: 'POST',
    token,
    body: rows,
    prefer: upsertOn ? 'return=representation,resolution=merge-duplicates' : 'return=representation',
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

export async function adminDelete(pathAndQuery, token) {
  const res = await request(`/rest/v1/${pathAndQuery}`, { method: 'DELETE', token, prefer: 'return=minimal' });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${JSON.stringify(res.data)}`);
}

// ===== التخزين (الصور) =====
const BUCKET = 'listing-images';

export async function storageUpload(path, bytes, contentType, token) {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'cache-control': 'max-age=31536000',
      'x-upsert': 'false',
    },
    body: bytes,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);
}

export async function storageRemove(paths, token) {
  const real = paths.filter((p) => p && !p.startsWith('/') && !p.startsWith('http'));
  if (real.length === 0) return;
  const res = await request(`/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    token,
    body: { prefixes: real },
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${JSON.stringify(res.data)}`);
}

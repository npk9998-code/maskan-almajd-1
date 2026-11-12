'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDelete, adminInsert, adminSelect, adminUpdate } from '@/lib/admin/api';
import { getActionToken } from '@/lib/admin/session';

const DIRECTIONS = ['north', 'south', 'east', 'west', 'center'];

async function requireToken() {
  const token = await getActionToken();
  if (!token) redirect('/admin/login');
  return token;
}

// المدن تأثر على كل صفحات الموقع العام
function revalidateCities() {
  revalidatePath('/');
  revalidatePath('/offers/[id]', 'page');
  revalidatePath('/admin', 'layout');
}

const cleanName = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 40) : '');

// "النرجس، الملقا\nالياسمين" ← ['النرجس','الملقا','الياسمين']
function parseDistricts(byDirection) {
  const rows = [];
  const seen = new Set();
  for (const direction of DIRECTIONS) {
    const raw = typeof byDirection?.[direction] === 'string' ? byDirection[direction] : '';
    for (const part of raw.split(/[،,\n;؛]+/)) {
      const name = cleanName(part.replace(/^حي\s+/, ''));
      if (!name || seen.has(name)) continue;
      seen.add(name);
      rows.push({ name, direction });
    }
  }
  return rows.slice(0, 300);
}

export async function setCityVisible(id, visible) {
  const token = await requireToken();
  if (!Number.isInteger(id)) return { ok: false, message: 'طلب غير صحيح' };
  try {
    const rows = await adminUpdate(`cities?id=eq.${id}&select=id`, { is_visible: Boolean(visible) }, token);
    if (!rows?.length) return { ok: false, message: 'المدينة غير موجودة' };
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  revalidateCities();
  return { ok: true };
}

export async function createCity(input) {
  const token = await requireToken();
  const name = cleanName(input?.name);
  if (!name) return { ok: false, errors: { name: 'اكتب اسم المدينة' } };
  const districts = parseDistricts(input?.districts);

  let cityId;
  try {
    const existing = await adminSelect(`cities?select=id&name=eq.${encodeURIComponent(name)}`, token);
    if (existing.length) return { ok: false, errors: { name: 'هالمدينة موجودة من قبل' } };
    const last = await adminSelect('cities?select=sort_order&order=sort_order.desc&limit=1', token);
    const [city] = await adminInsert(
      'cities?select=id',
      { name, is_visible: Boolean(input?.visible), sort_order: (last[0]?.sort_order ?? 0) + 1 },
      token,
    );
    cityId = city.id;
    if (districts.length) {
      await adminInsert('districts', districts.map((d) => ({ ...d, city_id: cityId })), token, {
        upsertOn: 'city_id,name',
        ignoreDuplicates: true,
      });
    }
  } catch {
    return { ok: false, message: 'ما قدرت أضيف المدينة، جرّب مرة ثانية' };
  }
  revalidateCities();
  redirect(`/admin/cities/${cityId}`);
}

export async function addDistricts(cityId, byDirection) {
  const token = await requireToken();
  if (!Number.isInteger(cityId)) return { ok: false, message: 'طلب غير صحيح' };
  const districts = parseDistricts(byDirection);
  if (!districts.length) return { ok: false, message: 'اكتب اسم حي واحد على الأقل' };
  try {
    const added = await adminInsert(
      'districts?select=id',
      districts.map((d) => ({ ...d, city_id: cityId })),
      token,
      { upsertOn: 'city_id,name', ignoreDuplicates: true },
    );
    revalidateCities();
    return { ok: true, added: added.length, skipped: districts.length - added.length };
  } catch {
    return { ok: false, message: 'ما قدرت أضيف الأحياء، جرّب مرة ثانية' };
  }
}

export async function setDistrictDirection(id, direction) {
  const token = await requireToken();
  if (!Number.isInteger(id) || !DIRECTIONS.includes(direction)) return { ok: false, message: 'طلب غير صحيح' };
  try {
    await adminUpdate(`districts?id=eq.${id}&select=id`, { direction }, token);
  } catch {
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  revalidateCities();
  return { ok: true };
}

export async function deleteDistrict(id) {
  const token = await requireToken();
  if (!Number.isInteger(id)) return { ok: false, message: 'طلب غير صحيح' };
  try {
    await adminDelete(`districts?id=eq.${id}`, token);
  } catch (err) {
    if (err.code === '23503') {
      return { ok: false, message: 'ما ينحذف لأن فيه عروض في هالحي. عدّل العروض أو احذفها قبل.' };
    }
    return { ok: false, message: 'صار خطأ، جرّب مرة ثانية' };
  }
  revalidateCities();
  return { ok: true };
}

'use server';

import { cookies } from 'next/headers';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';

const EVENTS = new Set(['view', 'whatsapp']);

// يزيد عداد المشاهدات أو الواتس (ما يحسب زيارات المدير)
export async function trackOfferEvent(id, event, first) {
  if (!Number.isInteger(id) || !EVENTS.has(event) || !SUPABASE_URL || !SUPABASE_KEY) return;
  const store = await cookies();
  if (store.has('mz_admin_rt') || store.has('mz_admin_at')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/track_listing_event`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_listing_id: id, p_event: event, p_first: Boolean(first) }),
    cache: 'no-store',
  }).catch(() => {});
}

async function isAdmin() {
  const store = await cookies();
  return store.has('mz_admin_rt') || store.has('mz_admin_at');
}

async function rpc(name, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => {});
}

// زيارة للموقع (مرة لكل جلسة)
export async function trackSiteVisit(first) {
  if (await isAdmin()) return;
  await rpc('track_site_visit', { p_first: Boolean(first) });
}

// بحث ما لقى نتيجة (للتقارير: وش يدور عليه العملاء)
export async function trackSearchMiss({ city, district, type, budget }) {
  if (await isAdmin()) return;
  const clean = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const b = Number(budget);
  await rpc('log_search_miss', {
    p_city: clean(city, 40),
    p_district: clean(district, 60),
    p_type: typeof type === 'string' && type !== 'all' ? type : '',
    p_budget: Number.isFinite(b) && b > 0 ? Math.round(b) : 0,
  });
}

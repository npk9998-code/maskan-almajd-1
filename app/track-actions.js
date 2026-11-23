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

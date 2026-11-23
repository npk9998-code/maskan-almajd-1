'use client';

import { trackOfferEvent } from '@/app/track-actions';

// كل جهاز يتذكر إنه انحسب، عشان "الأشخاص" ينحسبون مرة وحدة
function firstTime(key) {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

export function trackView(id) {
  trackOfferEvent(id, 'view', firstTime(`mz_v_${id}`)).catch(() => {});
}

export function trackWhatsapp(id) {
  trackOfferEvent(id, 'whatsapp', firstTime(`mz_w_${id}`)).catch(() => {});
}

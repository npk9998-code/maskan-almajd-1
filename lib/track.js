'use client';

import { trackOfferEvent, trackSearchMiss, trackSiteVisit } from '@/app/track-actions';

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

export function trackVisit() {
  try {
    if (sessionStorage.getItem('mz_visit')) return;
    sessionStorage.setItem('mz_visit', '1');
  } catch {
    return;
  }
  trackSiteVisit(firstTime('mz_person')).catch(() => {});
}

// نفس البحث ما ينحسب أكثر من مرة في الجلسة
const missed = new Set();
export function trackMiss(search) {
  const key = JSON.stringify(search);
  if (missed.has(key)) return;
  missed.add(key);
  trackSearchMiss(search).catch(() => {});
}

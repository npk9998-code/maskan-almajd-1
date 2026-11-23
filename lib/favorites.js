'use client';

import { useSyncExternalStore } from 'react';

// المفضلة محفوظة في جوال العميل (بدون تسجيل)
const KEY = 'mz_favs';
const SHOW_KEY = 'mz_show_favs';
const EVENT = 'mz-favs';
const EMPTY = [];

let cache = null;
let showFavs = false;

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? parsed.filter(Number.isInteger) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback) {
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null;
      callback();
    }
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleFavorite(id) {
  const list = read();
  cache = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list].slice(0, 100);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // التخزين مقفول (مثلاً التصفح الخاص) — تبقى للجلسة بس
  }
  emit();
}

// عرض المفضلة بس في صفحة العروض
export function useShowFavorites() {
  return useSyncExternalStore(
    subscribe,
    () => showFavs,
    () => false,
  );
}

export function setShowFavorites(value) {
  showFavs = value;
  emit();
}

// من صفحة التفاصيل: نحفظ الطلب ونفتحه في صفحة العروض
export function requestFavoritesOnHome() {
  try {
    sessionStorage.setItem(SHOW_KEY, '1');
  } catch {}
}

export function consumeFavoritesRequest() {
  try {
    if (sessionStorage.getItem(SHOW_KEY) === '1') {
      sessionStorage.removeItem(SHOW_KEY);
      return true;
    }
  } catch {}
  return false;
}

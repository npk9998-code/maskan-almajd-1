'use client';

import { normalizeArabic } from '@/lib/format';

import GEO_INDEX from '@/lib/geo-index.json';

// ملفات حدود الأحياء: ملف لكل مدينة (مصدرها: بيانات العنوان الوطني المفتوحة، CC0)
// الدرعية داخل الرياض، والخبر والظهران والقطيف وسيهات داخل الدمام
const GEO_FILES = new Map(GEO_INDEX.cities.map(([name, , file]) => [normalizeArabic(name), file]));
export const geoFile = (city) => GEO_FILES.get(normalizeArabic(String(city ?? ''))) ?? null;
export const hasCityMap = (city) => geoFile(city) != null;

export const districtKey = (name) => normalizeArabic(String(name ?? ''));

const shapesCache = new Map();

// يرجع Map: مفتاح الحي ← { name, center:[lng,lat], rings }
export function loadCityShapes(city) {
  const slug = geoFile(city);
  if (!slug) return Promise.resolve(new Map());
  if (!shapesCache.has(slug)) {
    shapesCache.set(
      slug,
      fetch(`/geo/c${slug}.json`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => new Map(list.map((f) => [districtKey(f.n), { name: f.n, center: f.c, rings: f.r, direction: f.d }])))
        .catch(() => {
          shapesCache.delete(slug);
          return new Map();
        }),
    );
  }
  return shapesCache.get(slug);
}

export function ringsBounds(ringsList) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rings of ringsList) {
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return Number.isFinite(minX) ? [[minX, minY], [maxX, maxY]] : null;
}

const polygon = (rings) => ({ type: 'MultiPolygon', coordinates: rings.map((r) => [r]) });

export function districtFeature(id, shape, props) {
  return { type: 'Feature', id, properties: { name: shape.name, ...props }, geometry: polygon(shape.rings) };
}

// ===== تحميل مكتبة الخريطة من CDN (ما تصرف من نقاط الموقع) =====
const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
const RTL_PLUGIN = 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js';
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

let libPromise = null;

export function loadMapLibre() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = MAPLIBRE_CSS;
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = MAPLIBRE_JS;
      script.async = true;
      script.onload = () => {
        const lib = window.maplibregl;
        try {
          if (lib.getRTLTextPluginStatus?.() === 'unavailable') Promise.resolve(lib.setRTLTextPlugin(RTL_PLUGIN, true)).catch(() => {});
        } catch {
          // الأسماء تطلع بدون تشكيل عربي صحيح بس الخريطة تشتغل
        }
        resolve(lib);
      };
      script.onerror = () => {
        libPromise = null;
        reject(new Error('map load failed'));
      };
      document.head.appendChild(script);
    });
  }
  return libPromise;
}

// أسماء الخريطة الأساسية بالعربي بدل (إنجليزي + عربي)
const AR_NAME = ['coalesce', ['get', 'name:ar'], ['get', 'name:nonlatin'], ['get', 'name']];
export function arabicLabels(map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const field = JSON.stringify(layer.layout?.['text-field'] ?? '');
    if (!field.includes('name')) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', AR_NAME);
    } catch {
      // نخليها مثل ما هي
    }
  }
}

export function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

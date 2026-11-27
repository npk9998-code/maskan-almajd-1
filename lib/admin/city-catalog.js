'use client';

// قائمة مدن المملكة (للاقتراحات) + أحياء المدينة الرسمية — تنزل في لوحة التحكم بس
import { normalizeArabic } from '@/lib/format';

let catalog = null;
export function loadCityCatalog() {
  if (!catalog) {
    catalog = fetch('/geo/all-cities.json')
      .then((r) => (r.ok ? r.json() : { regions: [], cities: [] }))
      .then(({ regions, cities }) =>
        cities.map(([name, region, count, file]) => ({ name, region: regions[region], count, file, key: normalizeArabic(name) })),
      )
      .catch(() => {
        catalog = null;
        return [];
      });
  }
  return catalog;
}

// أحياء المدينة مقسمة بالجهات (بنفس شكل خانات الأحياء)
export async function loadCityDistricts(file) {
  if (!file) return null;
  const res = await fetch(`/geo/c${file}.json`);
  if (!res.ok) return null;
  const list = await res.json();
  const byDirection = { north: [], south: [], east: [], west: [], center: [] };
  for (const f of list) (byDirection[f.d] ?? byDirection.center).push(f.n);
  return {
    count: list.length,
    value: Object.fromEntries(Object.entries(byDirection).map(([k, v]) => [k, v.join('\n')])),
  };
}

import { normalizeArabic, typeName } from '@/lib/format';

const NEAR_BUDGET_RATIO = 1.3;

// نفس فلاتر الصفحة الرئيسية (للخريطة)
export function filterOffers(offers, { query, direction, type, city, budget }) {
  const q = normalizeArabic(query ?? '');
  const max = budget ? Number(budget) * NEAR_BUDGET_RATIO : null;
  return offers.filter((o) => {
    if (direction && o.direction !== direction) return false;
    if (type && type !== 'all' && o.type !== type) return false;
    if (city && o.city !== city) return false;
    if (max && o.price != null && o.price > max) return false;
    if (q) {
      const hay = normalizeArabic(`${o.district} ${o.city} ${typeName(o)}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

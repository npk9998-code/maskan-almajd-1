// اختيار ٣ عروض مشابهة (المعروضة بس)
const SIMILAR_COUNT = 3;

function tier(base, o) {
  const sameType =
    o.type === base.type && (base.type !== 'other' || (o.customType ?? '') === (base.customType ?? ''));
  if (o.city !== base.city) return null;
  if (sameType && o.direction === base.direction) return 0;
  if (sameType) return 1;
  return 2;
}

export function pickSimilar(base, offers) {
  const scored = [];
  for (const o of offers) {
    if (o.id === base.id || o.status !== 'available') continue;
    const t = tier(base, o);
    if (t == null) continue;
    const gap = base.price != null && o.price != null ? Math.abs(o.price - base.price) : Number.MAX_SAFE_INTEGER;
    scored.push({ o, t, gap });
  }
  scored.sort((a, b) => a.t - b.t || a.gap - b.gap);
  return scored.slice(0, SIMILAR_COUNT).map((s) => s.o);
}

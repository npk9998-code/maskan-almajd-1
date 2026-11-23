import { offerHeading, offerSpecs, offerTitle, priceInfo, pricePerMeter } from '@/lib/format';

// رسالة جاهزة للمشاركة (بدون الملاحظات الخاصة)
export function offerShareText(offer, siteUrl) {
  const price = priceInfo(offer);
  const specs = offerSpecs(offer)
    .filter((s) => s.value != null && s.value !== '—' && s.value !== '')
    .map((s) => `${s.label}: ${s.value}`);
  const ppm = pricePerMeter(offer);
  const lines = [
    `${offerTitle(offer)} — ${offerHeading(offer)}، ${offer.city}`,
    `رقم العرض: ${offer.id}`,
    '',
    ...specs,
    offer.features?.length ? `المميزات: ${offer.features.join('، ')}` : null,
    '',
    `السعر: ${price.text}${price.note ? ` (${price.note})` : ''}`,
    ppm ? `سعر المتر: ${ppm}` : null,
    '',
    `التفاصيل والصور: ${siteUrl}/offers/${offer.id}`,
  ];
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

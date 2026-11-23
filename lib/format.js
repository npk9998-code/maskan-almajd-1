export const TYPE_LABEL = { villa: 'فيلا', apartment: 'شقة', land: 'أرض', other: 'أخرى' };

export const TYPE_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'villa', label: 'فيلا' },
  { key: 'apartment', label: 'شقة' },
  { key: 'land', label: 'أرض' },
  { key: 'other', label: 'أخرى' },
];

export const DIRECTIONS = [
  { key: 'north', label: 'الشمال', short: 'شمال' },
  { key: 'south', label: 'الجنوب', short: 'جنوب' },
  { key: 'east', label: 'الشرق', short: 'شرق' },
  { key: 'west', label: 'الغرب', short: 'غرب' },
  { key: 'center', label: 'الوسط', short: 'وسط' },
];

const DIRECTION_SHORT = Object.fromEntries(DIRECTIONS.map((d) => [d.key, d.short]));

const numberFormat = new Intl.NumberFormat('en-US');
export const formatNumber = (n) => numberFormat.format(n);

// اسم النوع: للنوع "أخرى" ياخذ اللي كتبه المدير (مثل عمارة)
export const typeName = (offer) =>
  offer.type === 'other' ? offer.customType?.trim() || 'عقار' : TYPE_LABEL[offer.type];

export const offerTitle = (offer) => `${typeName(offer)} للبيع`;

// العنوان الكبير = الحي، وتحته النوع والمدينة
export const offerHeading = (offer) => `حي ${offer.district}`;
export const offerSubtitle = (offer) => `${offerTitle(offer)} · ${offer.city}`;

// سعر مختصر للمربعات الصغيرة
export function shortPrice(offer) {
  if (offer.priceDisplay === 'hidden' || offer.price == null) return 'عند التواصل';
  const n = offer.price;
  if (n >= 1_000_000) return `${Number((n / 1_000_000).toFixed(2))} مليون`;
  if (n >= 1_000) return `${Number((n / 1_000).toFixed(0))} ألف`;
  return `${formatNumber(n)} ريال`;
}

export function priceInfo(offer) {
  if (offer.priceDisplay === 'hidden' || offer.price == null) {
    return { text: 'السعر عند التواصل', note: null, hidden: true };
  }
  return {
    text: `${formatNumber(offer.price)} ريال`,
    note: offer.priceDisplay === 'negotiable' ? 'قابل للتفاوض' : null,
    hidden: false,
  };
}

const countWord = (n, few, one) => (n >= 3 && n <= 10 ? few : one);
export const roomsText = (n) => `${n} ${countWord(n, 'غرف', 'غرفة')}`;
export const bathsText = (n) => `${n} ${countWord(n, 'دورات', 'دورة')}`;
export const areaText = (n) => `${formatNumber(n)} م²`;

export function ageText(years) {
  if (years == null) return '—';
  if (years === 0) return 'جديد';
  if (years === 1) return 'سنة';
  if (years === 2) return 'سنتين';
  return `${years} ${countWord(years, 'سنوات', 'سنة')}`;
}

const FLOORS = ['الأرضي', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
export const floorText = (f) => (f == null ? '—' : FLOORS[f] ?? `${f}`);

const NEW_DAYS = 7;
export const isNew = (offer) =>
  offer.status !== 'sold' && Date.now() - new Date(offer.createdAt).getTime() < NEW_DAYS * 86400000;

// المواصفات حسب نوع العقار
export function offerSpecs(offer) {
  const age = { label: 'عمر العقار', value: ageText(offer.ageYears) };
  const facade = { label: 'الواجهة', value: offer.facade ?? '—' };
  const area = { label: 'المساحة', value: offer.area ? areaText(offer.area) : '—' };
  const street = { label: 'عرض الشارع', value: offer.streetWidth ? `${offer.streetWidth} م` : '—' };

  if (offer.type === 'land') return [area, facade, street];
  if (offer.type === 'other') {
    // كل المواصفات، والفاضي ما يطلع
    return [
      area,
      { label: 'الغرف', value: offer.rooms ?? null },
      { label: 'دورات المياه', value: offer.bathrooms ?? null },
      { label: 'عمر العقار', value: offer.ageYears == null ? null : ageText(offer.ageYears) },
      { label: 'الواجهة', value: offer.facade ?? null },
      { label: 'عرض الشارع', value: offer.streetWidth ? `${offer.streetWidth} م` : null },
      { label: 'الدور', value: offer.floor == null ? null : floorText(offer.floor) },
    ].filter((spec) => spec.value != null && spec.value !== '—');
  }
  const base = [
    area,
    { label: 'الغرف', value: offer.rooms ?? '—' },
    { label: 'دورات المياه', value: offer.bathrooms ?? '—' },
    age,
    facade,
  ];
  return offer.type === 'apartment'
    ? [...base, { label: 'الدور', value: floorText(offer.floor) }]
    : [...base, street];
}

// توحيد الحروف العربية للبحث
const ARABIC_NORMALIZE = /[أإآ]/g;
const DIACRITICS = /[ً-ْـ]/g;
export function normalizeArabic(text) {
  return text
    .replace(DIACRITICS, '')
    .replace(ARABIC_NORMALIZE, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^حي\s+|\s+حي\s+/g, ' ')
    .trim();
}

export function resultsHeading({ direction, city }) {
  const dir = direction ? DIRECTION_SHORT[direction] : null;
  if (dir && city) return `عروض ${dir} ${city}`;
  if (dir) return `عروض ال${dir}`;
  if (city) return `عروض ${city}`;
  return 'كل العروض';
}

export const whatsappLink = (number, text) =>
  number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;

// رسالة "ما لقيت طلبك" فيها اللي كان العميل يدور عليه
export function requestMessage({ query, direction, type, city, budget }) {
  const parts = [];
  if (type && type !== 'all') parts.push(TYPE_LABEL[type]);
  if (city) parts.push(`في ${city}`);
  if (direction) parts.push(`(${DIRECTION_SHORT[direction]})`);
  if (query) parts.push(`حي ${query.trim()}`);
  if (budget) parts.push(`بميزانية ${formatNumber(Number(budget))} ريال`);
  const wanted = parts.length ? ` أبحث عن ${parts.join(' ')}` : '';
  return `السلام عليكم، ما لقيت طلبي في الموقع.${wanted}`;
}

// رسالة الواتس لعرض معيّن
export const offerWhatsappText = (offer, siteUrl) =>
  `السلام عليكم، أبغى أستفسر عن العرض رقم ${offer.id} - ${offerTitle(offer)} في حي ${offer.district}\n${siteUrl}/offers/${offer.id}`;

export const GENERAL_WHATSAPP_TEXT = 'السلام عليكم، أبغى أستفسر عن عروضكم العقارية';

// سعر المتر (إذا مفعّل للعرض والسعر ظاهر)
export function pricePerMeter(offer) {
  if (!offer.showPricePerMeter || offer.priceDisplay === 'hidden' || !offer.price || !offer.area) return null;
  return `${formatNumber(Math.round(offer.price / offer.area))} ريال/م²`;
}

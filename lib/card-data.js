import { isNew, isPriceDropped } from '@/lib/format';

// بيانات الكرت اللي تنرسل للمتصفح
export function toCardData(offer) {
  return {
    id: offer.id,
    type: offer.type,
    customType: offer.customType,
    city: offer.city,
    district: offer.district,
    direction: offer.direction,
    price: offer.price,
    priceDisplay: offer.priceDisplay,
    showPricePerMeter: offer.showPricePerMeter,
    area: offer.area,
    rooms: offer.rooms,
    bathrooms: offer.bathrooms,
    facade: offer.facade,
    streetWidth: offer.streetWidth,
    ageYears: offer.ageYears,
    status: offer.status,
    isNew: isNew(offer),
    featured: offer.featured,
    priceDropped: isPriceDropped(offer),
    previousPrice: isPriceDropped(offer) ? offer.previousPrice : null,
    image: offer.images[0]?.thumb ?? null,
  };
}

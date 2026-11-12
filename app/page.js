import OffersBrowser from '@/components/OffersBrowser';
import SiteHeader from '@/components/SiteHeader';
import { isNew } from '@/lib/format';
import { OFFERS } from '@/lib/sample-offers';
import { VISIBLE_CITIES } from '@/lib/site';

// نرسل للمتصفح بس اللي يحتاجه الكرت، والسعر المخفي ما يطلع أبداً
function toCardData(offer) {
  return {
    id: offer.id,
    type: offer.type,
    city: offer.city,
    district: offer.district,
    direction: offer.direction,
    price: offer.priceDisplay === 'hidden' ? null : offer.price,
    priceDisplay: offer.priceDisplay,
    area: offer.area,
    rooms: offer.rooms ?? null,
    bathrooms: offer.bathrooms ?? null,
    facade: offer.facade ?? null,
    streetWidth: offer.streetWidth ?? null,
    status: offer.status,
    isNew: isNew(offer),
    images: offer.images.slice(0, 1),
  };
}

export default function HomePage() {
  const offers = OFFERS.filter((o) => VISIBLE_CITIES.includes(o.city)).map(toCardData);

  return (
    <>
      <SiteHeader />
      <main className="container page">
        <div className="hero">
          <h1>عروض عقارية مختارة</h1>
          <p>تصفّح العروض وتواصل معي مباشرة لأي استفسار</p>
        </div>
        <OffersBrowser offers={offers} cities={VISIBLE_CITIES} />
      </main>
    </>
  );
}

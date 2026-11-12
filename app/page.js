import OffersBrowser from '@/components/OffersBrowser';
import SiteHeader from '@/components/SiteHeader';
import { isNew } from '@/lib/format';
import { getPublicOffers, getVisibleCities } from '@/lib/offers';
import { getSiteUrl, getWhatsAppNumber } from '@/lib/site';

// الصفحة تتحدث من قاعدة البيانات كل دقيقة
export const revalidate = 60;

// نرسل للمتصفح بس اللي يحتاجه الكرت
function toCardData(offer) {
  return {
    id: offer.id,
    type: offer.type,
    customType: offer.customType,
    city: offer.city,
    district: offer.district,
    direction: offer.direction,
    price: offer.price,
    priceDisplay: offer.priceDisplay,
    area: offer.area,
    rooms: offer.rooms,
    bathrooms: offer.bathrooms,
    facade: offer.facade,
    streetWidth: offer.streetWidth,
    ageYears: offer.ageYears,
    status: offer.status,
    isNew: isNew(offer),
    image: offer.images[0]?.thumb ?? null,
  };
}

export default async function HomePage() {
  const [offers, cities] = await Promise.all([getPublicOffers(), getVisibleCities()]);

  return (
    <>
      <SiteHeader />
      <main className="container page">
        <div className="hero">
          <h1>عروض عقارية مختارة</h1>
          <p>تصفّح العروض وتواصل معي مباشرة لأي استفسار</p>
        </div>
        <OffersBrowser
          offers={offers.map(toCardData)}
          cities={cities}
          whatsappNumber={getWhatsAppNumber()}
          siteUrl={getSiteUrl()}
        />
      </main>
    </>
  );
}

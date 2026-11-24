import BottomTabs from '@/components/BottomTabs';
import MapBrowser from '@/components/MapBrowser';
import { toCardData } from '@/lib/card-data';
import { getPublicOffers, getVisibleCities } from '@/lib/offers';
import { getWhatsAppNumber } from '@/lib/site';

export const revalidate = 60;

export const metadata = {
  title: 'العروض على الخريطة',
  description: 'شوف العروض العقارية على الخريطة حسب الأحياء',
  alternates: { canonical: '/map' },
};

export default async function MapPage() {
  const [offers, cities] = await Promise.all([getPublicOffers(), getVisibleCities()]);
  return (
    <>
      <main className="map-page">
        <h1 className="sr-only">العروض على الخريطة</h1>
        <MapBrowser offers={offers.map(toCardData)} cities={cities} whatsappNumber={getWhatsAppNumber()} />
      </main>
      <BottomTabs />
    </>
  );
}

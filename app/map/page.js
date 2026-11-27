import BottomTabs from '@/components/BottomTabs';
import MapBrowser from '@/components/MapBrowser';
import { toCardData } from '@/lib/card-data';
import { groupCitiesByRegion } from '@/lib/format';
import { getPublicOffers, getVisibleCityRegions } from '@/lib/offers';
import { getWhatsAppNumber } from '@/lib/site';

export const revalidate = 60;

export const metadata = {
  title: 'العروض على الخريطة',
  description: 'شوف العروض العقارية على الخريطة حسب الأحياء',
  alternates: { canonical: '/map' },
};

export default async function MapPage() {
  const [offers, cityRegions] = await Promise.all([getPublicOffers(), getVisibleCityRegions()]);
  return (
    <>
      <main className="map-page">
        <h1 className="sr-only">العروض على الخريطة</h1>
        <MapBrowser offers={offers.map(toCardData)} cities={cityRegions.map((c) => c.name)} cityGroups={groupCitiesByRegion(cityRegions)} whatsappNumber={getWhatsAppNumber()} />
      </main>
      <BottomTabs />
    </>
  );
}

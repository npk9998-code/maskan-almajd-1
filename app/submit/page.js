import SiteHeader from '@/components/SiteHeader';
import SubmitForm from '@/components/SubmitForm';
import { getPublicDistricts, getVisibleCities } from '@/lib/offers';
import { getWhatsAppNumber } from '@/lib/site';

export const revalidate = 60;

export const metadata = {
  title: 'اعرض عقارك',
  description: 'عندك عقار تبي تبيعه؟ عبّ بياناته ونتواصل معك',
  alternates: { canonical: '/submit' },
};

export default async function SubmitPage() {
  const [cities, districtsByCity] = await Promise.all([getVisibleCities(), getPublicDistricts()]);
  return (
    <>
      <SiteHeader />
      <main className="container page sub-page">
        <section className="sub-hero">
          <h1>اعرض عقارك معنا</h1>
          <p>عبّ البيانات، ونراجعها ونتواصل معك</p>
        </section>
        <SubmitForm cities={cities} districtsByCity={districtsByCity} whatsappNumber={getWhatsAppNumber()} />
      </main>
    </>
  );
}

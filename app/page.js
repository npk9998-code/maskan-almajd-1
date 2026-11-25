import OffersBrowser from '@/components/OffersBrowser';
import SiteHeader from '@/components/SiteHeader';
import Link from 'next/link';
import BottomTabs from '@/components/BottomTabs';
import Tour, { TourReplayButton } from '@/components/Tour';
import { toCardData } from '@/lib/card-data';
import { getPublicOffers, getVisibleCities } from '@/lib/offers';
import { getSiteUrl, getWhatsAppNumber } from '@/lib/site';

// الصفحة تتحدث من قاعدة البيانات كل دقيقة
export const revalidate = 60;

export default async function HomePage() {
  const [offers, cities] = await Promise.all([getPublicOffers(), getVisibleCities()]);

  return (
    <>
      <SiteHeader />
      <main className="container page has-tabs">
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
        <section className="sub-cta" aria-labelledby="sub-cta-title">
          <div>
            <h2 id="sub-cta-title">عندك عقار تبي تبيعه؟</h2>
            <p>اعرضه معنا ونتواصل معك</p>
          </div>
          <Link href="/submit" className="btn" data-tour="submit">
            اعرض عقارك
          </Link>
        </section>
        <footer className="site-footer">
          <TourReplayButton />
        </footer>
      </main>
      <Tour />
      <BottomTabs />
    </>
  );
}

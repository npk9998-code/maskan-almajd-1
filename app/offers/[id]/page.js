import Link from 'next/link';
import { notFound } from 'next/navigation';
import FavButton from '@/components/FavButton';
import Gallery from '@/components/Gallery';
import ViewTracker from '@/components/ViewTracker';
import WhatsAppLink from '@/components/WhatsAppLink';
import ShareButton from '@/components/ShareButton';
import { ChatIcon, ChevronIcon, LockIcon, PinIcon } from '@/components/Icons';
import { NumberBadge, OfferCover, StatusBadge, Watermark } from '@/components/OfferMedia';
import SimilarOffers from '@/components/SimilarOffers';
import { isNew, offerHeading, offerSpecs, offerSubtitle, offerTitle, offerWhatsappText, priceInfo, pricePerMeter, whatsappLink } from '@/lib/format';
import { getPublicOffer, getPublicOffers } from '@/lib/offers';
import { pickSimilar } from '@/lib/similar';
import { getFalLicense, getSiteUrl, getWhatsAppNumber } from '@/lib/site';

// كل صفحة عرض تتجهز أول مرة تنفتح، وتتحدث من قاعدة البيانات كل دقيقة
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const offer = await getPublicOffer(id);
  if (!offer) return { title: 'العرض غير موجود' };
  const title = `${offerTitle(offer)} في حي ${offer.district} — رقم ${offer.id}`;
  const price = priceInfo(offer);
  const description = [
    `${offer.city}، حي ${offer.district}`,
    offer.area ? `${offer.area} م²` : null,
    price.text + (price.note ? ` (${price.note})` : ''),
  ]
    .filter(Boolean)
    .join(' · ');
  // صورة العرض (واتساب ما يقرا SVG، فالصور التجريبية تاخذ الصورة العامة)
  const photo = offer.images.find((img) => img.full && !img.full.endsWith('.svg'))?.full;
  const images = photo ? [{ url: photo, alt: title }] : [{ url: '/og.jpg', width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: `/offers/${offer.id}` },
    openGraph: { type: 'article', title, description, url: `/offers/${offer.id}`, images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
  };
}

export default async function OfferPage({ params }) {
  const { id } = await params;
  const [offer, allOffers] = await Promise.all([getPublicOffer(id), getPublicOffers()]);
  if (!offer) notFound();
  const similar = pickSimilar(offer, allOffers);

  const title = offerTitle(offer);
  const price = priceInfo(offer);
  const specs = offerSpecs(offer);
  const hasImages = offer.images.length > 0;
  const siteUrl = getSiteUrl();
  const whatsappHref = whatsappLink(getWhatsAppNumber(), offerWhatsappText(offer, siteUrl));
  const showStatus = offer.status === 'sold' || isNew(offer);

  return (
    <>
      <ViewTracker id={offer.id} />
      <main className="details">
        <div className={hasImages ? 'gallery' : 'gallery gallery--cover'}>
          {hasImages ? (
            <Gallery images={offer.images.map((img) => img.full)} label={`صور ${title} في حي ${offer.district}`} />
          ) : (
            <OfferCover offer={offer} size="hero" />
          )}
          <div className="gallery__top">
            <Link href="/" className="icon-btn" aria-label="رجوع للعروض">
              <ChevronIcon />
            </Link>
            <div className="gallery__top-end">
              <NumberBadge id={offer.id} />
              <FavButton id={offer.id} className="icon-btn fav-icon-btn" />
            </div>
          </div>
          {hasImages ? null : <Watermark onCover />}
        </div>

        <div className="container details__body">
          {showStatus ? (
            <div className="details__status">
              <StatusBadge offer={offer} isNew={isNew(offer)} />
            </div>
          ) : null}
          <h1 className="details__title">{offerHeading(offer)}</h1>
          <p className="details__location">
            <PinIcon className="icon-sm" />
            <span>{offerSubtitle(offer)}</span>
          </p>
          <p className={price.hidden ? 'details__price details__price--hidden' : 'details__price'}>
            {price.text}
          </p>
          {price.note ? <p className="price__note">{price.note}</p> : null}
          {pricePerMeter(offer) ? <p className="price__ppm tabular">{pricePerMeter(offer)}</p> : null}

          <dl className="specs">
            {specs.map((s) => (
              <div key={s.label} className="spec">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>

          {offer.features.length > 0 ? (
            <section className="panel" aria-labelledby="features-title">
              <h2 id="features-title">المميزات</h2>
              <ul className="tags">
                {offer.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {offer.description ? (
            <section className="panel" aria-labelledby="about-title">
              <h2 id="about-title">نبذة عن العقار</h2>
              <p className="panel__text">{offer.description}</p>
            </section>
          ) : null}

          <div className="notice">
            <LockIcon className="notice__icon" />
            <div>
              <p className="notice__title">الموقع الدقيق وباقي التفاصيل</p>
              <p className="notice__text">تُرسل لك عند التواصل عبر واتساب</p>
            </div>
          </div>

          <div className="licenses">
            <p>
              رقم ترخيص الإعلان: <span className="tabular">{offer.adLicense ?? '—'}</span>
            </p>
            <p>
              رخصة فال: <span className="tabular">{getFalLicense() ?? '—'}</span>
            </p>
          </div>

          <SimilarOffers offers={similar} />
        </div>
      </main>

      <div className="bottom-bar">
        <div className="container bottom-bar__inner">
          {whatsappHref ? (
            <WhatsAppLink offerId={offer.id} href={whatsappHref} className="btn btn--wa btn--lg bottom-bar__main">
              <ChatIcon />
              <span>تواصل معي عبر واتساب</span>
            </WhatsAppLink>
          ) : null}
          <ShareButton
            url={`${siteUrl}/offers/${offer.id}`}
            title={`${title} في حي ${offer.district} — رقم ${offer.id}`}
          />
        </div>
      </div>
    </>
  );
}

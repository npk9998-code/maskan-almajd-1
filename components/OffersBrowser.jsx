'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import OfferCard from '@/components/OfferCard';
import SearchFilters from '@/components/SearchFilters';
import { ChatIcon, HeartIcon } from '@/components/Icons';
import { consumeFavoritesRequest, setShowFavorites, useFavorites, useShowFavorites } from '@/lib/favorites';
import { trackMiss, trackVisit } from '@/lib/track';
import {
  normalizeArabic,
  offerWhatsappText,
  requestMessage,
  resultsHeading,
  typeName,
  whatsappLink,
} from '@/lib/format';

const NEAR_BUDGET_RATIO = 1.3; // مقارب لميزانيتك: لين 30% أغلى

function NoResults({ href, hasFilters, onReset }) {
  return (
    <div className="no-results">
      <p className="no-results__title">ما لقيت طلبك؟ تواصل معي</p>
      <p className="no-results__text">قل لي وش تدور عليه، وأبلغك أول ما يتوفر عرض يناسبك.</p>
      <div className="no-results__actions">
        {href ? (
          <a href={href} className="btn btn--wa" target="_blank" rel="noopener noreferrer">
            <ChatIcon />
            <span>تواصل معي عبر واتساب</span>
          </a>
        ) : (
          <button type="button" className="btn btn--wa">
            <ChatIcon />
            <span>تواصل معي عبر واتساب</span>
          </button>
        )}
        {hasFilters ? (
          <button type="button" className="btn btn--outline" onClick={onReset}>
            مسح الفلاتر
          </button>
        ) : null}
      </div>
    </div>
  );
}

const PAGE = 12;

// يعرض ١٢ عرض، وكل ما ينزل العميل تطلع اللي بعدها (أخف على الجوال)
function OfferGrid({ offers, priorityFirst, whatsappNumber, siteUrl }) {
  const [shown, setShown] = useState(PAGE);
  const moreRef = useRef(null);
  const hasMore = shown < offers.length;

  useEffect(() => {
    setShown(PAGE);
  }, [offers]);

  useEffect(() => {
    const el = moreRef.current;
    if (!el || !hasMore || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE);
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown]);

  return (
    <>
      <div className="grid">
        {offers.slice(0, shown).map((offer, i) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            priority={priorityFirst && i < 4}
            whatsappHref={whatsappLink(whatsappNumber, offerWhatsappText(offer, siteUrl))}
          />
        ))}
      </div>
      {hasMore ? (
        <div ref={moreRef} className="grid-more">
          <button type="button" className="btn btn--outline" onClick={() => setShown((n) => n + PAGE)}>
            عرض المزيد ({offers.length - shown})
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function OffersBrowser({ offers, cities, cityGroups, whatsappNumber, siteUrl }) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState(null);
  const [type, setType] = useState('all');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const favorites = useFavorites();
  const showFavs = useShowFavorites();

  // جاي من صفحة عرض وضاغط زر المفضلة
  useEffect(() => {
    if (consumeFavoritesRequest()) setShowFavorites(true);
    trackVisit();
  }, []);

  const favoriteOffers = useMemo(() => {
    const byId = new Map(offers.map((o) => [o.id, o]));
    return favorites.map((id) => byId.get(id)).filter(Boolean);
  }, [offers, favorites]);

  const deferredQuery = useDeferredValue(query);
  const maxPrice = budget ? Number(budget) : null;

  const { main, near } = useMemo(() => {
    const q = normalizeArabic(deferredQuery);
    const main = [];
    const near = [];
    for (const offer of offers) {
      if (direction && offer.direction !== direction) continue;
      if (type !== 'all' && offer.type !== type) continue;
      if (city && offer.city !== city) continue;
      if (q) {
        const haystack = normalizeArabic(`${offer.district} ${offer.city} ${typeName(offer)}`);
        if (!haystack.includes(q)) continue;
      }
      if (maxPrice && offer.price != null) {
        if (offer.price <= maxPrice) main.push(offer);
        else if (offer.price <= maxPrice * NEAR_BUDGET_RATIO) near.push(offer);
        continue;
      }
      main.push(offer); // السعر المخفي يطلع دايم
    }
    // الفرص أول شي
    const byFeatured = (a, b) => Number(b.featured && b.status !== 'sold') - Number(a.featured && a.status !== 'sold');
    main.sort(byFeatured);
    return { main, near };
  }, [offers, deferredQuery, direction, type, city, maxPrice]);

  const hasFilters = query || direction || type !== 'all' || city || budget;
  const featured = hasFilters ? [] : main.filter((o) => o.featured && o.status !== 'sold');
  const rest = featured.length ? main.filter((o) => !(o.featured && o.status !== 'sold')) : main;
  const noResults = !showFavs && hasFilters && main.length === 0 && near.length === 0;

  // نسجل البحث اللي ما لقى شي (بعد ما يوقف العميل عن الكتابة)
  useEffect(() => {
    if (!noResults) return undefined;
    const t = setTimeout(() => trackMiss({ city, district: deferredQuery, type, budget }), 2500);
    return () => clearTimeout(t);
  }, [noResults, city, deferredQuery, type, budget]);
  const resetFilters = () => {
    setQuery('');
    setDirection(null);
    setType('all');
    setCity('');
    setBudget('');
  };

  return (
    <>
      <SearchFilters
        query={query}
        onQuery={setQuery}
        type={type}
        onType={setType}
        direction={direction}
        onDirection={setDirection}
        budget={budget}
        onBudget={setBudget}
        city={city}
        onCity={setCity}
        cities={cities}
        cityGroups={cityGroups}
      />

      {showFavs ? (
        <section aria-labelledby="favs-heading" className="results">
          <div className="results__head">
            <h2 id="favs-heading">المفضلة</h2>
            <button type="button" className="link-btn" onClick={() => setShowFavorites(false)}>
              كل العروض
            </button>
          </div>
          {favoriteOffers.length ? (
            <OfferGrid offers={favoriteOffers} priorityFirst whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
          ) : (
            <div className="no-results">
              <HeartIcon className="no-results__icon" />
              <p className="no-results__title">ما عندك عروض في المفضلة</p>
              <p className="no-results__text">اضغط القلب على أي عرض يعجبك، ويتحفظ هنا.</p>
              <button type="button" className="btn btn--outline" onClick={() => setShowFavorites(false)}>
                تصفح العروض
              </button>
            </div>
          )}
        </section>
      ) : (
      <section aria-labelledby="results-heading" className="results">
        <div className="results__head">
          <h2 id="results-heading">{resultsHeading({ direction, city })}</h2>
          <span className="results__sort">الأحدث أولاً</span>
        </div>

        <p className="sr-only" aria-live="polite">
          {main.length + near.length} عرض
        </p>

        {featured.length > 0 ? (
          <div className="featured-block">
            <h3 className="featured-block__title" data-tour="featured">✨ فرص مميزة</h3>
            <OfferGrid offers={featured} priorityFirst whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
            {rest.length ? <h3 className="featured-block__title featured-block__title--rest">كل العروض</h3> : null}
          </div>
        ) : null}
        {rest.length > 0 ? (
          <OfferGrid offers={rest} priorityFirst={!featured.length} whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
        ) : main.length > 0 ? null : near.length > 0 ? (
          <p className="empty empty--inline">ما فيه عروض داخل ميزانيتك، شوف المقاربة لها تحت.</p>
        ) : (
          <NoResults
            href={whatsappLink(whatsappNumber, requestMessage({ query, direction, type, city, budget }))}
            hasFilters={Boolean(hasFilters)}
            onReset={resetFilters}
          />
        )}

        {near.length > 0 ? (
          <>
            <div className="divider" role="separator">
              <span>مقارب لميزانيتك</span>
            </div>
            <OfferGrid offers={near} whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
          </>
        ) : null}
      </section>
      )}
    </>
  );
}

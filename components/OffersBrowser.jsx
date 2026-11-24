'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import OfferCard from '@/components/OfferCard';
import SearchFilters from '@/components/SearchFilters';
import { ChatIcon, HeartIcon } from '@/components/Icons';
import { consumeFavoritesRequest, setShowFavorites, useFavorites, useShowFavorites } from '@/lib/favorites';
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

function OfferGrid({ offers, priorityFirst, whatsappNumber, siteUrl }) {
  return (
    <div className="grid">
      {offers.map((offer, i) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          priority={priorityFirst && i < 2}
          whatsappHref={whatsappLink(whatsappNumber, offerWhatsappText(offer, siteUrl))}
        />
      ))}
    </div>
  );
}

export default function OffersBrowser({ offers, cities, whatsappNumber, siteUrl }) {
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
    return { main, near };
  }, [offers, deferredQuery, direction, type, city, maxPrice]);

  const hasFilters = query || direction || type !== 'all' || city || budget;
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

        {main.length > 0 ? (
          <OfferGrid offers={main} priorityFirst whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
        ) : near.length > 0 ? (
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

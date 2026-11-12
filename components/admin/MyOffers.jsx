'use client';

import { useDeferredValue, useMemo, useOptimistic, useState, useTransition } from 'react';
import { setListingStatus } from '@/app/admin/actions';
import { SearchIcon, TYPE_ICON } from '@/components/Icons';
import { formatNumber, normalizeArabic, offerTitle } from '@/lib/format';

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'available', label: 'معروض' },
  { key: 'hidden', label: 'مخفي' },
  { key: 'sold', label: 'تم البيع' },
];

const STATUS_CHIP = {
  available: { label: 'معروض', className: 'status status--available' },
  hidden: { label: 'مخفي', className: 'status status--hidden' },
  sold: { label: 'تم البيع', className: 'status status--sold' },
};

function priceLine(o) {
  if (o.priceDisplay === 'hidden') return 'السعر مخفي';
  if (o.price == null) return '—';
  const base = `${formatNumber(o.price)} ريال`;
  return o.priceDisplay === 'negotiable' ? `${base} · قابل للتفاوض` : base;
}

function OfferRow({ offer, onStatus, busy }) {
  const Icon = TYPE_ICON[offer.type];
  const chip = STATUS_CHIP[offer.status];
  const hidden = offer.status === 'hidden';
  const sold = offer.status === 'sold';

  return (
    <article className="admin-card" aria-busy={busy || undefined}>
      <div className="admin-card__top">
        <div className={offer.thumb ? 'admin-card__thumb' : 'admin-card__thumb admin-card__thumb--cover'}>
          {offer.thumb ? (
            <img src={offer.thumb} alt="" width={128} height={128} loading="lazy" decoding="async" />
          ) : (
            <Icon />
          )}
        </div>
        <div className="admin-card__info">
          <div className="admin-card__title-row">
            <h2>{offerTitle(offer)}</h2>
            <span className={chip.className}>{chip.label}</span>
          </div>
          <p className="admin-card__meta tabular">
            رقم {offer.id} · {offer.city} · حي {offer.district}
          </p>
          <p className="admin-card__price tabular">{priceLine(offer)}</p>
        </div>
      </div>

      <div className="admin-card__actions">
        <button type="button" className="btn btn--outline" title="نشغله في الجزء الجاي">
          تعديل
        </button>
        <button
          type="button"
          className="btn btn--outline"
          disabled={busy}
          onClick={() => onStatus(offer.id, hidden ? 'available' : 'hidden')}
        >
          {hidden ? 'إظهار' : 'إخفاء'}
        </button>
        <button
          type="button"
          className="btn btn--outline"
          disabled={busy}
          onClick={() => onStatus(offer.id, sold ? 'available' : 'sold')}
        >
          {sold ? 'إرجاع للعرض' : 'تم البيع'}
        </button>
      </div>
    </article>
  );
}

export default function MyOffers({ offers }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(offers, (list, { id, status }) =>
    list.map((o) => (o.id === id ? { ...o, status } : o)),
  );

  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const c = { available: 0, hidden: 0, sold: 0 };
    for (const o of optimistic) c[o.status] += 1;
    return c;
  }, [optimistic]);

  const visible = useMemo(() => {
    const q = normalizeArabic(deferredQuery.trim());
    return optimistic.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      if (/^\d+$/.test(q)) return String(o.id).includes(q);
      return normalizeArabic(`${o.district} ${o.city}`).includes(q);
    });
  }, [optimistic, deferredQuery, filter]);

  const changeStatus = (id, status) => {
    setError('');
    setBusyId(id);
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await setListingStatus(id, status);
      if (!result?.ok) setError(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
      setBusyId(null);
    });
  };

  return (
    <div className="admin-body">
      <dl className="admin-stats">
        <div>
          <dt>معروض</dt>
          <dd className="tabular">{counts.available}</dd>
        </div>
        <div>
          <dt>مخفي</dt>
          <dd className="tabular">{counts.hidden}</dd>
        </div>
        <div>
          <dt>تم البيع</dt>
          <dd className="tabular">{counts.sold}</dd>
        </div>
      </dl>

      <label className="search">
        <SearchIcon className="search__icon" />
        <span className="sr-only">ابحث برقم العرض أو الحي</span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث برقم العرض أو الحي…"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
        />
      </label>

      <div className="chips admin-filters" role="group" aria-label="فلتر الحالة">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              className={active ? 'pill pill--round is-active' : 'pill pill--round'}
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <div className="admin-list">
          {visible.map((o) => (
            <OfferRow key={o.id} offer={o} onStatus={changeStatus} busy={busyId === o.id} />
          ))}
        </div>
      ) : (
        <p className="empty">ما فيه عروض هنا.</p>
      )}
    </div>
  );
}

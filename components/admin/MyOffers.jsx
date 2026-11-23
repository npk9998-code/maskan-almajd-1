'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useOptimistic, useState, useTransition } from 'react';
import { setListingStatus } from '@/app/admin/actions';
import { ChatIcon, ChevronDownIcon, EyeIcon, SearchIcon, ShareIcon, TYPE_ICON, UserIcon } from '@/components/Icons';
import { offerShareText } from '@/lib/admin/share-text';
import { formatNumber, normalizeArabic, offerTitle } from '@/lib/format';

// الفلاتر للعروض الظاهرة (المخفية في الأرشيف تحت)
const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'available', label: 'معروض' },
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

function Stats({ stats }) {
  return (
    <p className="admin-stats-line tabular" aria-label="إحصائيات العرض">
      <span title="الأشخاص (كل جهاز مرة)">
        <UserIcon className="icon-xs" /> {stats.people} شخص
      </span>
      <span title="كل مرات الفتح">
        <EyeIcon className="icon-xs" /> {stats.views} مشاهدة
      </span>
      <span title="ضغطوا واتساب (كل جهاز مرة)">
        <ChatIcon className="icon-xs" /> {stats.whatsapp} واتساب
      </span>
    </p>
  );
}

function ShareOffer({ offer, siteUrl, onCopied }) {
  const share = async () => {
    const text = offerShareText(offer, siteUrl);
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // قفل القائمة
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      window.prompt('انسخ الرسالة:', text);
    }
  };
  return (
    <button type="button" className="btn btn--outline btn--icon" onClick={share} aria-label={`مشاركة العرض رقم ${offer.id}`}>
      <ShareIcon />
    </button>
  );
}

function OfferRow({ offer, onStatus, busy, siteUrl, onCopied }) {
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

      <Stats stats={offer.stats} />

      <div className={hidden ? 'admin-card__actions' : 'admin-card__actions admin-card__actions--share'}>
        <Link href={`/admin/offers/${offer.id}/edit`} className="btn btn--outline">
          تعديل
        </Link>
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
        {hidden ? null : <ShareOffer offer={offer} siteUrl={siteUrl} onCopied={onCopied} />}
      </div>
    </article>
  );
}

export default function MyOffers({ offers, siteUrl }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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

  const { visible, archived } = useMemo(() => {
    const q = normalizeArabic(deferredQuery.trim());
    const matches = (o) => {
      if (!q) return true;
      if (/^\d+$/.test(q)) return String(o.id).includes(q);
      return normalizeArabic(`${o.district} ${o.city} ${o.customType ?? ''}`).includes(q);
    };
    const visible = [];
    const archived = [];
    for (const o of optimistic) {
      if (!matches(o)) continue;
      if (o.status === 'hidden') archived.push(o);
      else if (filter === 'all' || o.status === filter) visible.push(o);
    }
    return { visible, archived };
  }, [optimistic, deferredQuery, filter]);

  // البحث يفتح الأرشيف تلقائياً إذا لقى فيه نتائج
  const searching = deferredQuery.trim().length > 0;
  const showArchive = archiveOpen || (searching && archived.length > 0);

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

  const onCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rowProps = { onStatus: changeStatus, siteUrl, onCopied };

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

      <div className="chips admin-filters admin-filters--3" role="group" aria-label="فلتر الحالة">
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
            <OfferRow key={o.id} offer={o} busy={busyId === o.id} {...rowProps} />
          ))}
        </div>
      ) : (
        <p className="empty">ما فيه عروض هنا.</p>
      )}

      <section className="archive">
        <button
          type="button"
          className={showArchive ? 'archive__toggle is-open' : 'archive__toggle'}
          aria-expanded={showArchive}
          aria-controls="archive-list"
          onClick={() => setArchiveOpen((v) => !v)}
        >
          <span>
            الأرشيف <span className="muted tabular">({searching ? archived.length : counts.hidden})</span>
          </span>
          <ChevronDownIcon className="archive__chevron" />
        </button>
        {showArchive ? (
          <div className="admin-list" id="archive-list">
            {archived.length ? (
              archived.map((o) => <OfferRow key={o.id} offer={o} busy={busyId === o.id} {...rowProps} />)
            ) : (
              <p className="empty">ما فيه عروض مخفية.</p>
            )}
          </div>
        ) : null}
      </section>

      {copied ? (
        <span className="toast" role="status">
          انتسخت رسالة العرض ✓
        </span>
      ) : null}
    </div>
  );
}

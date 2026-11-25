'use client';

import Link from 'next/link';
import { useDeferredValue, useId, useMemo, useOptimistic, useState, useTransition } from 'react';
import { setListingStatus } from '@/app/admin/actions';
import { deleteOffer } from '@/app/admin/offer-actions';
import Tour, { TourReplayButton } from '@/components/Tour';
import {
  ChatIcon,
  ChevronDownIcon,
  EyeIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  TrashIcon,
  TYPE_ICON,
  UserIcon,
} from '@/components/Icons';
import { offerShareText } from '@/lib/admin/share-text';
import { DIRECTIONS, TYPE_FILTERS, formatNumber, normalizeArabic, offerTitle } from '@/lib/format';

// "بانتظار النشر" لحالها وما تطلع تحت "الكل"
const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'available', label: 'معروض' },
  { key: 'sold', label: 'تم البيع' },
  { key: 'pending', label: 'بانتظار النشر' },
];

const STATUS_CHIP = {
  available: { label: 'معروض', className: 'status status--available' },
  hidden: { label: 'مخفي', className: 'status status--hidden' },
  sold: { label: 'تم البيع', className: 'status status--sold' },
  pending: { label: 'بانتظار النشر', className: 'status status--pending' },
};

const ADDED = [
  { key: 'week', label: 'آخر أسبوع', days: 7 },
  { key: 'month', label: 'آخر شهر', days: 30 },
  { key: 'older', label: 'أقدم من شهر', days: -30 },
];

const SORTS = [
  { key: 'newest', label: 'الأحدث' },
  { key: 'oldest', label: 'الأقدم' },
  { key: 'priceHigh', label: 'الأعلى سعر' },
  { key: 'priceLow', label: 'الأقل سعر' },
  { key: 'views', label: 'الأكثر مشاهدة' },
];

const EMPTY_ADV = { type: 'all', city: '', district: '', direction: null, priceMin: '', priceMax: '', areaMin: '', areaMax: '', added: null, sort: 'newest' };

const ADMIN_TOUR = [
  { target: 'nav-requests', title: 'الطلبات', text: 'هنا توصلك عروض العملاء، والرقم الأحمر يقول كم طلب جديد. وفيها رابط «اعرض عقارك» تنسخه أو تشاركه مع أي مالك.' },
  { target: 'nav-offers', title: 'عروضي', text: 'كل عروضك هنا: تنشر وتخفي وتعدل وتشارك.' },
  { target: 'filter-pending', title: 'بانتظار النشر', text: 'الطلبات اللي قبلتها توصل هنا، وما تنزل للعملاء إلا لما تضغط «نشر».' },
  { target: 'admin-advanced', title: 'البحث المتقدم', text: 'دوّر وفلتر عروضك بالنوع والمدينة والسعر والمساحة، ورتبها مثل ما تبي.' },
  { target: 'admin-add', title: 'إضافة عرض', text: 'من هنا تضيف عرض جديد بنفسك.' },
  { target: 'nav-cities', title: 'المدن', text: 'تظهر وتخفي المدن، وتضيف الأحياء.' },
  { target: 'storage', title: 'مساحة الصور', text: 'يبين كم استهلكت من مساحة الصور المجانية (١ جيجا).' },
  { target: 'trash', title: 'سلة المحذوفات', text: 'أي عرض تحذفه يجلس هنا ٣٠ يوم، وتقدر ترجعه.' },
];

const digits = (v) => v.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').slice(0, 12);
const grouped = (v) => (v ? formatNumber(Number(v)) : '');

function priceLine(o) {
  if (o.priceDisplay === 'hidden') return o.price ? `${formatNumber(o.price)} ريال · مخفي` : 'السعر مخفي';
  if (o.price == null) return '—';
  const base = `${formatNumber(o.price)} ريال`;
  return o.priceDisplay === 'negotiable' ? `${base} · قابل للتفاوض` : base;
}

function sizeText(bytes) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1000 ? `${(mb / 1024).toFixed(2)} جيجا` : `${Math.round(mb)} ميقا`;
}

function StorageBar({ bytes }) {
  if (bytes == null) return null;
  const limit = 1024 * 1024 * 1024;
  const pct = Math.min(100, (bytes / limit) * 100);
  const level = pct >= 90 ? 'is-danger' : pct >= 70 ? 'is-warn' : '';
  return (
    <div className="storage-bar" data-tour="storage">
      <div className="storage-bar__text">
        <span>مساحة الصور</span>
        <span className="tabular">
          {sizeText(bytes)} من ١ جيجا ({Math.round(pct)}٪)
        </span>
      </div>
      <div
        className={`storage-bar__track ${level}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="المستهلك من مساحة الصور"
      >
        <span style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      {pct >= 90 ? <p className="storage-bar__warn">المساحة قربت تخلص: احذف عروض قديمة أو فضّ السلة.</p> : null}
    </div>
  );
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

function OfferRow({ offer, onStatus, onDelete, busy, siteUrl, onCopied }) {
  const [confirming, setConfirming] = useState(false);
  const Icon = TYPE_ICON[offer.type];
  const chip = STATUS_CHIP[offer.status];
  const hidden = offer.status === 'hidden';
  const sold = offer.status === 'sold';
  const pending = offer.status === 'pending';

  return (
    <article className={pending ? 'admin-card admin-card--pending' : 'admin-card'} aria-busy={busy || undefined}>
      <div className="admin-card__body">
        <div className="admin-card__top">
          <div className={offer.thumb ? 'admin-card__thumb' : 'admin-card__thumb admin-card__thumb--cover'}>
            {offer.thumb ? <img src={offer.thumb} alt="" width={128} height={128} loading="lazy" decoding="async" /> : <Icon />}
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
        {pending ? null : <Stats stats={offer.stats} />}
        {pending ? (
          <div className="pending-cover" aria-hidden="true">
            <span>قيد المراجعة قبل النشر</span>
          </div>
        ) : null}
      </div>

      {pending ? (
        confirming ? (
          <div className="trash-confirm">
            <p>ينتقل لسلة المحذوفات ٣٠ يوم، وتقدر ترجعه منها.</p>
            <div className="trash-actions">
              <button type="button" className="btn btn--danger" disabled={busy} onClick={() => onDelete(offer.id)}>
                احذفه
              </button>
              <button type="button" className="btn btn--outline" disabled={busy} onClick={() => setConfirming(false)}>
                تراجع
              </button>
            </div>
          </div>
        ) : (
          <div className="admin-card__actions admin-card__actions--pending">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onStatus(offer.id, 'available')}>
              نشر
            </button>
            <Link href={`/admin/offers/${offer.id}/edit`} className="btn btn--outline">
              تعديل أو معاينة
            </Link>
            <button type="button" className="btn btn--outline req-reject" disabled={busy} onClick={() => setConfirming(true)}>
              حذف
            </button>
          </div>
        )
      ) : (
        <div className={hidden ? 'admin-card__actions' : 'admin-card__actions admin-card__actions--share'}>
          <Link href={`/admin/offers/${offer.id}/edit`} className="btn btn--outline">
            تعديل
          </Link>
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => onStatus(offer.id, hidden ? 'available' : 'hidden')}>
            {hidden ? 'إظهار' : 'إخفاء'}
          </button>
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => onStatus(offer.id, sold ? 'available' : 'sold')}>
            {sold ? 'إرجاع للعرض' : 'تم البيع'}
          </button>
          {hidden ? null : <ShareOffer offer={offer} siteUrl={siteUrl} onCopied={onCopied} />}
        </div>
      )}
    </article>
  );
}

function Range({ label, min, max, onMin, onMax, unit }) {
  return (
    <fieldset className="adv-range">
      <legend>{label}</legend>
      <div className="adv-range__row">
        <div className="field">
          <input inputMode="numeric" className="tabular" value={grouped(min)} onChange={(e) => onMin(digits(e.target.value))} placeholder="من" aria-label={`${label} من`} />
        </div>
        <span aria-hidden="true">–</span>
        <div className="field">
          <input inputMode="numeric" className="tabular" value={grouped(max)} onChange={(e) => onMax(digits(e.target.value))} placeholder="إلى" aria-label={`${label} إلى`} />
        </div>
        <span className="adv-range__unit">{unit}</span>
      </div>
    </fieldset>
  );
}

function ChipGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className="chips">
        {options.map((o) => {
          const active = value === o.key;
          return (
            <button key={o.key} type="button" className={active ? 'pill pill--soft is-active' : 'pill pill--soft'} aria-pressed={active} onClick={() => onChange(active && o.key !== 'all' && o.key !== 'newest' ? null : o.key)}>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function MyOffers({ offers, siteUrl, storage, trashCount, initialFilter = 'all' }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(initialFilter);
  const [adv, setAdv] = useState(EMPTY_ADV);
  const [advOpen, setAdvOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [, startTransition] = useTransition();
  const advId = useId();
  const [optimistic, applyOptimistic] = useOptimistic(offers, (list, change) =>
    change.removed ? list.filter((o) => o.id !== change.id) : list.map((o) => (o.id === change.id ? { ...o, status: change.status } : o)),
  );

  const deferredQuery = useDeferredValue(query);
  const deferredAdv = useDeferredValue(adv);
  const setA = (key) => (value) => setAdv((a) => ({ ...a, [key]: value }));

  const cities = useMemo(() => [...new Set(offers.map((o) => o.city).filter(Boolean))].sort(), [offers]);

  const counts = useMemo(() => {
    const c = { available: 0, hidden: 0, sold: 0, pending: 0 };
    for (const o of optimistic) c[o.status] += 1;
    return c;
  }, [optimistic]);

  const advCount = [
    adv.type !== 'all',
    adv.city,
    adv.district,
    adv.direction,
    adv.priceMin || adv.priceMax,
    adv.areaMin || adv.areaMax,
    adv.added,
    adv.sort !== 'newest',
  ].filter(Boolean).length;

  const { visible, archived } = useMemo(() => {
    const q = normalizeArabic(deferredQuery.trim());
    const a = deferredAdv;
    const dq = normalizeArabic(a.district.trim());
    const now = Date.now();
    const added = ADDED.find((x) => x.key === a.added);
    const matches = (o) => {
      if (q) {
        const isNum = /^\d+$/.test(q);
        if (!(isNum && String(o.id).includes(q)) && !normalizeArabic(`${o.district} ${o.city} ${o.customType ?? ''} ${o.notes}`).includes(q)) return false;
      }
      if (a.type !== 'all' && o.type !== a.type) return false;
      if (a.city && o.city !== a.city) return false;
      if (dq && !normalizeArabic(o.district).includes(dq)) return false;
      if (a.direction && o.direction !== a.direction) return false;
      if (a.priceMin && !(o.price >= Number(a.priceMin))) return false;
      if (a.priceMax && !(o.price != null && o.price <= Number(a.priceMax))) return false;
      if (a.areaMin && !(o.area >= Number(a.areaMin))) return false;
      if (a.areaMax && !(o.area != null && o.area <= Number(a.areaMax))) return false;
      if (added) {
        const age = (now - new Date(o.createdAt).getTime()) / 86_400_000;
        if (added.days > 0 ? age > added.days : age <= -added.days) return false;
      }
      return true;
    };
    const visible = [];
    const archived = [];
    for (const o of optimistic) {
      if (!matches(o)) continue;
      if (o.status === 'hidden') archived.push(o);
      else if (filter === 'all' ? o.status !== 'pending' : o.status === filter) visible.push(o);
    }
    const by = {
      newest: (x, y) => new Date(y.createdAt) - new Date(x.createdAt),
      oldest: (x, y) => new Date(x.createdAt) - new Date(y.createdAt),
      priceHigh: (x, y) => (y.price ?? -1) - (x.price ?? -1),
      priceLow: (x, y) => (x.price ?? Infinity) - (y.price ?? Infinity),
      views: (x, y) => y.stats.views - x.stats.views,
    }[a.sort];
    if (by) {
      visible.sort(by);
      archived.sort(by);
    }
    return { visible, archived };
  }, [optimistic, deferredQuery, deferredAdv, filter]);

  const searching = deferredQuery.trim().length > 0 || advCount > 0;
  const showArchive = archiveOpen || (searching && archived.length > 0);

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 2500);
  };

  const changeStatus = (id, status) => {
    setError('');
    setBusyId(id);
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await setListingStatus(id, status);
      if (!result?.ok) setError(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
      else if (status === 'available' && offers.find((o) => o.id === id)?.status === 'pending') flash('انتشر العرض ✓');
      setBusyId(null);
    });
  };

  const remove = (id) => {
    setError('');
    setBusyId(id);
    startTransition(async () => {
      applyOptimistic({ id, removed: true });
      const result = await deleteOffer(id, { stay: true });
      if (!result?.ok) setError(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
      else flash('انتقل لسلة المحذوفات');
      setBusyId(null);
    });
  };

  const rowProps = { onStatus: changeStatus, onDelete: remove, siteUrl, onCopied: () => flash('انتسخت رسالة العرض ✓') };

  return (
    <div className="admin-body">
      <StorageBar bytes={storage} />

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
        <span className="sr-only">ابحث برقم العرض أو الحي أو الملاحظات</span>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث برقم العرض أو الحي أو الملاحظات…"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        className={advOpen ? 'advanced-toggle is-open' : 'advanced-toggle'}
        aria-expanded={advOpen}
        aria-controls={advId}
        onClick={() => setAdvOpen((v) => !v)}
        data-tour="admin-advanced"
      >
        <SlidersIcon className="icon-sm" />
        <span>بحث متقدم</span>
        {advCount ? <span className="advanced-toggle__count tabular">{advCount}</span> : null}
        <ChevronDownIcon className="advanced-toggle__chevron" />
      </button>

      {advOpen ? (
        <div className="advanced admin-advanced" id={advId}>
          <ChipGroup label="نوع العقار" options={TYPE_FILTERS} value={adv.type} onChange={(v) => setA('type')(v ?? 'all')} />
          <div className="adv-two">
            <label className="field field--select">
              <span className="sr-only">المدينة</span>
              <select value={adv.city} onChange={(e) => setA('city')(e.target.value)}>
                <option value="">كل المدن</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="field__chevron" />
            </label>
            <label className="field">
              <span className="sr-only">الحي</span>
              <input value={adv.district} onChange={(e) => setA('district')(e.target.value)} placeholder="الحي" autoComplete="off" />
            </label>
          </div>
          <ChipGroup label="موقع الحي" options={DIRECTIONS} value={adv.direction} onChange={setA('direction')} />
          <Range label="السعر" unit="ريال" min={adv.priceMin} max={adv.priceMax} onMin={setA('priceMin')} onMax={setA('priceMax')} />
          <Range label="المساحة" unit="م²" min={adv.areaMin} max={adv.areaMax} onMin={setA('areaMin')} onMax={setA('areaMax')} />
          <ChipGroup label="تاريخ الإضافة" options={ADDED} value={adv.added} onChange={setA('added')} />
          <ChipGroup label="الترتيب" options={SORTS} value={adv.sort} onChange={(v) => setA('sort')(v ?? 'newest')} />
          {advCount ? (
            <button type="button" className="btn btn--outline" onClick={() => setAdv(EMPTY_ADV)}>
              مسح
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="chips admin-filters" role="group" aria-label="فلتر الحالة">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const badge = f.key === 'pending' && counts.pending ? counts.pending : 0;
          return (
            <button
              key={f.key}
              type="button"
              className={active ? 'pill pill--round is-active' : 'pill pill--round'}
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              data-tour={f.key === 'pending' ? 'filter-pending' : undefined}
            >
              {f.label}
              {badge ? <span className="pill__badge tabular">{badge}</span> : null}
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
        <p className="empty">{filter === 'pending' ? 'ما فيه عروض بانتظار النشر. الطلبات اللي تقبلها توصل هنا.' : 'ما فيه عروض هنا.'}</p>
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

      <Link href="/admin/trash" className="trash-link" data-tour="trash">
        <TrashIcon className="icon-sm" />
        <span>سلة المحذوفات</span>
        <span className="muted tabular">({trashCount})</span>
      </Link>

      <div className="site-footer">
        <TourReplayButton eventName="mz-admin-tour" label="كيف أستخدم لوحة التحكم؟" />
      </div>
      <Tour steps={ADMIN_TOUR} storageKey="mz_admin_tour_done" eventName="mz-admin-tour" />

      {toast ? (
        <span className="toast" role="status">
          {toast}
        </span>
      ) : null}
    </div>
  );
}

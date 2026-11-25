'use client';

import { useEffect, useState, useTransition } from 'react';
import { acceptRequest, rejectRequest } from '@/app/admin/request-actions';
import { ChatIcon, CloseIcon, CopyIcon, EyeIcon, LinkIcon, ShareIcon, TYPE_ICON, UserIcon } from '@/components/Icons';
import { AGE_OPTIONS, FLOOR_OPTIONS } from '@/lib/admin/options';
import { formatNumber, typeName } from '@/lib/format';

const SHARE_TEXT = 'حياك، تقدر تعرض عقارك من هنا:';

export function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'الحين';
  if (mins < 60) return mins === 1 ? 'قبل دقيقة' : mins === 2 ? 'قبل دقيقتين' : `قبل ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'قبل ساعة' : hours === 2 ? 'قبل ساعتين' : `قبل ${hours} ساعات`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'أمس' : days === 2 ? 'قبل يومين' : `قبل ${days} أيام`;
}

const dateText = (iso) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const waNumber = (phone) => `966${phone.replace(/^0/, '')}`;

export function requestSummary(r) {
  return [r.city, r.area ? `${formatNumber(r.area)} م²` : null, r.price ? `${formatNumber(r.price)} ريال` : 'بدون سعر']
    .filter(Boolean)
    .join(' · ');
}

function SubmitLinkBox({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('انسخ الرابط:', url);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: `${SHARE_TEXT}\n${url}` });
      } catch {
        // قفل القائمة
      }
      return;
    }
    copy();
  };
  return (
    <section className="req-link" data-tour="submit-link" aria-labelledby="req-link-title">
      <h2 id="req-link-title">
        <LinkIcon className="icon-sm" /> رابط «اعرض عقارك» للعملاء
      </h2>
      <p className="req-link__url" dir="ltr">
        {url.replace(/^https?:\/\//, '')}
      </p>
      <div className="req-link__actions">
        <button type="button" className="btn btn--outline" onClick={copy}>
          <CopyIcon className="icon-sm" />
          <span aria-live="polite">{copied ? 'تم النسخ ✓' : 'نسخ'}</span>
        </button>
        <button type="button" className="btn btn--primary" onClick={share}>
          <ShareIcon className="icon-sm" />
          مشاركة
        </button>
      </div>
    </section>
  );
}

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="req-preview__row">
      <span>{label}</span>
      <b className="tabular">{value}</b>
    </div>
  );
}

export function RequestPreview({ request: r, onClose, actions }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const age = AGE_OPTIONS.find((o) => o.value === String(r.ageYears))?.label;
  const floor = FLOOR_OPTIONS.find((o) => o.value === String(r.floor))?.label;

  return (
    <div className="req-sheet" role="dialog" aria-modal="true" aria-labelledby="req-sheet-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="req-sheet__panel">
        <div className="req-sheet__head">
          <h2 id="req-sheet-title">معاينة الطلب</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" autoFocus>
            <CloseIcon />
          </button>
        </div>

        {r.images.length ? (
          <div className="req-sheet__images">
            {r.images.map((img, i) => (
              <a key={img.full} href={img.full} target="_blank" rel="noopener noreferrer" aria-label={`فتح الصورة ${i + 1}`}>
                <img src={img.thumb} alt="" loading="lazy" />
              </a>
            ))}
          </div>
        ) : (
          <p className="muted">ما أرفق صور.</p>
        )}

        <div className="req-preview">
          <Row label="النوع" value={typeName(r)} />
          <Row label="المدينة والحي" value={`${r.city} · ${r.district}`} />
          <Row label="المساحة" value={r.area ? `${formatNumber(r.area)} م²` : null} />
          <Row label="السعر" value={r.price ? `${formatNumber(r.price)} ريال` : 'ما حدد'} />
          <Row label="الغرف" value={r.rooms} />
          <Row label="دورات المياه" value={r.bathrooms} />
          <Row label="عمر العقار" value={age} />
          <Row label="الدور" value={floor} />
          <Row label="الواجهة" value={r.facade} />
          <Row label="عرض الشارع" value={r.streetWidth ? `${r.streetWidth} م` : null} />
          <Row label="رقم الصك" value={r.deed} />
        </div>

        {r.description ? (
          <>
            <p className="req-preview__label">الوصف</p>
            <p className="req-preview__desc">{r.description}</p>
          </>
        ) : null}

        <div className="req-preview__owner">
          <p>
            <UserIcon className="icon-xs" /> {r.name} · <span className="tabular" dir="ltr">{r.phone}</span>
          </p>
          <p>✓ وافق مبدئياً على عقد الوساطة · {dateText(r.consentAt)}</p>
        </div>

        {actions}
      </div>
    </div>
  );
}

export default function RequestsList({ requests, submitUrl }) {
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const list = requests.filter((r) => !hiddenIds.has(r.id));
  const preview = list.find((r) => r.id === previewId);

  const flash = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 3500);
  };

  const run = (id, action, done) => {
    setError('');
    setBusyId(id);
    startTransition(async () => {
      const result = await action(id);
      setBusyId(null);
      if (!result?.ok) {
        setError(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
        return;
      }
      setPreviewId(null);
      setHiddenIds((s) => new Set(s).add(id));
      flash(result.message ?? done);
    });
  };

  const accept = (id) => run(id, acceptRequest, 'انتقل لـ«بانتظار النشر»');
  const reject = (id) => run(id, rejectRequest, 'انتقل لسلة المحذوفات (٧ أيام)');

  const buttons = (r) => (
    <>
      <button type="button" className="btn btn--primary" disabled={busyId === r.id} onClick={() => accept(r.id)}>
        {busyId === r.id ? 'لحظة…' : 'قبول'}
      </button>
      <button type="button" className="btn btn--outline req-reject" disabled={busyId === r.id} onClick={() => reject(r.id)}>
        رفض
      </button>
    </>
  );

  return (
    <div className="admin-body">
      <SubmitLinkBox url={submitUrl} />

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {list.length ? (
        <div className="admin-list">
          {list.map((r) => {
            const Icon = TYPE_ICON[r.type];
            const thumb = r.images[0]?.thumb;
            return (
              <article key={r.id} className="admin-card" aria-busy={busyId === r.id || undefined}>
                <div className="admin-card__top">
                  <div className={thumb ? 'admin-card__thumb' : 'admin-card__thumb admin-card__thumb--cover'}>
                    {thumb ? <img src={thumb} alt="" width={128} height={128} loading="lazy" decoding="async" /> : <Icon />}
                  </div>
                  <div className="admin-card__info">
                    <div className="admin-card__title-row">
                      <h2>
                        حي {r.district} · {typeName(r)}
                      </h2>
                    </div>
                    <p className="admin-card__meta tabular">{requestSummary(r)}</p>
                    <p className="admin-card__meta">
                      <UserIcon className="icon-xs" /> {r.name} · {timeAgo(r.createdAt)}
                      {r.images.length ? ` · ${r.images.length} صور` : ''}
                    </p>
                  </div>
                </div>
                <div className="req-actions">
                  {buttons(r)}
                  <button type="button" className="btn btn--outline" onClick={() => setPreviewId(r.id)}>
                    <EyeIcon className="icon-sm" />
                    معاينة
                  </button>
                  <a
                    className="btn btn--wa"
                    href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(`السلام عليكم ${r.name}، معك مسكن المجد للعقارات بخصوص طلبك لعرض عقارك في حي ${r.district}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ChatIcon className="icon-sm" />
                    واتساب
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty req-empty">
          <p>ما فيه طلبات جديدة.</p>
          <p className="muted">انسخ الرابط فوق وأرسله لأي مالك يبي يعرض عقاره.</p>
        </div>
      )}

      {preview ? (
        <RequestPreview
          request={preview}
          onClose={() => setPreviewId(null)}
          actions={<div className="req-sheet__actions">{buttons(preview)}</div>}
        />
      ) : null}

      {toast ? (
        <span className="toast" role="status">
          {toast}
        </span>
      ) : null}
    </div>
  );
}

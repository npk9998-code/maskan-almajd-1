'use client';

import { useState, useTransition } from 'react';
import { purgeOffer, restoreOffer } from '@/app/admin/offer-actions';
import { purgeRequest, restoreRequest } from '@/app/admin/request-actions';
import { RequestPreview, requestSummary } from '@/components/admin/RequestsList';
import { TYPE_ICON } from '@/components/Icons';
import { formatNumber, typeName } from '@/lib/format';

function daysLeft(iso, days) {
  const left = Math.ceil((new Date(iso).getTime() + days * 86_400_000 - Date.now()) / 86_400_000);
  if (left <= 0) return 'ينحذف اليوم';
  if (left === 1) return 'باقي يوم';
  if (left === 2) return 'باقي يومين';
  return `باقي ${left} ${left <= 10 ? 'أيام' : 'يوم'}`;
}

function Card({ thumb, type, title, meta, left, busy, onRestore, onPurge, onPreview, confirming, onConfirm, onCancel }) {
  const Icon = TYPE_ICON[type];
  return (
    <article className="admin-card" aria-busy={busy || undefined}>
      <div className="admin-card__top">
        <div className={thumb ? 'admin-card__thumb' : 'admin-card__thumb admin-card__thumb--cover'}>
          {thumb ? <img src={thumb} alt="" width={128} height={128} loading="lazy" decoding="async" /> : <Icon />}
        </div>
        <div className="admin-card__info">
          <div className="admin-card__title-row">
            <h2>{title}</h2>
            <span className="status status--hidden">{left}</span>
          </div>
          <p className="admin-card__meta tabular">{meta}</p>
        </div>
      </div>
      {confirming ? (
        <div className="trash-confirm">
          <p>متأكد؟ ينحذف نهائياً مع صوره، وما يرجع.</p>
          <div className="trash-actions">
            <button type="button" className="btn btn--danger" disabled={busy} onClick={onConfirm}>
              ايه، احذفه نهائياً
            </button>
            <button type="button" className="btn btn--outline" disabled={busy} onClick={onCancel}>
              تراجع
            </button>
          </div>
        </div>
      ) : (
        <div className="trash-actions">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={onRestore}>
            إرجاع
          </button>
          {onPreview ? (
            <button type="button" className="btn btn--outline" onClick={onPreview}>
              معاينة
            </button>
          ) : null}
          <button type="button" className="btn btn--outline req-reject" disabled={busy} onClick={onPurge}>
            حذف نهائي
          </button>
        </div>
      )}
    </article>
  );
}

export default function TrashList({ offers, requests, offerDays, requestDays }) {
  const [gone, setGone] = useState(() => new Set());
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const run = (key, action, id, done) => {
    setError('');
    setBusy(key);
    startTransition(async () => {
      const result = await action(id);
      setBusy(null);
      setConfirm(null);
      if (!result?.ok) {
        setError(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
        return;
      }
      setGone((s) => new Set(s).add(key));
      setToast(done);
      setTimeout(() => setToast(''), 2500);
    });
  };

  const offerList = offers.filter((o) => !gone.has(`o${o.id}`));
  const requestList = requests.filter((r) => !gone.has(`r${r.id}`));
  const previewing = requestList.find((r) => r.id === preview);

  return (
    <div className="admin-body">
      <p className="trash-note">
        العروض المحذوفة تبقى هنا {offerDays} يوم، والطلبات المرفوضة {requestDays} أيام، وبعدها تنحذف تلقائياً مع صورها.
      </p>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <h2 className="trash-heading">
        عروض محذوفة <span className="muted tabular">({offerList.length})</span>
      </h2>
      {offerList.length ? (
        <div className="admin-list">
          {offerList.map((o) => {
            const key = `o${o.id}`;
            return (
              <Card
                key={key}
                thumb={o.thumb}
                type={o.type}
                title={`حي ${o.district} · ${typeName(o)}`}
                meta={`رقم ${o.id} · ${o.city}${o.area ? ` · ${formatNumber(o.area)} م²` : ''}`}
                left={daysLeft(o.deletedAt, offerDays)}
                busy={busy === key}
                confirming={confirm === key}
                onRestore={() => run(key, restoreOffer, o.id, 'رجع العرض لعروضي ✓')}
                onPurge={() => setConfirm(key)}
                onConfirm={() => run(key, purgeOffer, o.id, 'انحذف نهائياً')}
                onCancel={() => setConfirm(null)}
              />
            );
          })}
        </div>
      ) : (
        <p className="empty">ما فيه عروض محذوفة.</p>
      )}

      <h2 className="trash-heading">
        طلبات مرفوضة <span className="muted tabular">({requestList.length})</span>
      </h2>
      {requestList.length ? (
        <div className="admin-list">
          {requestList.map((r) => {
            const key = `r${r.id}`;
            return (
              <Card
                key={key}
                thumb={r.images[0]?.thumb}
                type={r.type}
                title={`حي ${r.district} · ${typeName(r)}`}
                meta={`${requestSummary(r)} · ${r.name}`}
                left={daysLeft(r.rejectedAt, requestDays)}
                busy={busy === key}
                confirming={confirm === key}
                onRestore={() => run(key, restoreRequest, r.id, 'رجع الطلب لخانة الطلبات ✓')}
                onPreview={() => setPreview(r.id)}
                onPurge={() => setConfirm(key)}
                onConfirm={() => run(key, purgeRequest, r.id, 'انحذف نهائياً')}
                onCancel={() => setConfirm(null)}
              />
            );
          })}
        </div>
      ) : (
        <p className="empty">ما فيه طلبات مرفوضة.</p>
      )}

      {previewing ? <RequestPreview request={previewing} onClose={() => setPreview(null)} /> : null}

      {toast ? (
        <span className="toast" role="status">
          {toast}
        </span>
      ) : null}
    </div>
  );
}

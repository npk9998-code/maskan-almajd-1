'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadOfferImage } from '@/app/admin/offer-actions';
import { ChevronIcon } from '@/components/Icons';
import { processImage } from '@/lib/admin/image-processing';
import { SITE } from '@/lib/site';

const MAX_IMAGES = 20;

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14" />
    </svg>
  );
}

// الصور: رفع أكثر من صورة، حذف، وتغيير الترتيب (الأولى = الغلاف)
// عرض الصورة كاملة لما تضغط عليها
function Lightbox({ images, index, onClose, onNavigate }) {
  const img = images[index];
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNavigate(1);
      else if (e.key === 'ArrowRight') onNavigate(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onNavigate]);

  if (!img) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`الصورة ${index + 1} من ${images.length}`} onClick={onClose}>
      <img src={img.fullPreview ?? img.preview} alt={`الصورة ${index + 1}`} onClick={(e) => e.stopPropagation()} />
      <button type="button" className="lightbox__close" onClick={onClose} aria-label="إغلاق">
        ×
      </button>
      <span className="lightbox__count tabular">
        {index + 1} / {images.length}
      </span>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(-1);
            }}
            disabled={index === 0}
            aria-label="الصورة السابقة"
          >
            <ChevronIcon />
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(1);
            }}
            disabled={index === images.length - 1}
            aria-label="الصورة التالية"
          >
            <ChevronIcon style={{ rotate: '180deg' }} />
          </button>
        </>
      ) : null}
    </div>
  );
}

export default function ImagePicker({ images, onChange, onRemoveSaved, onBusyChange }) {
  const inputRef = useRef(null);
  const [viewing, setViewing] = useState(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');

  const setBusy = (delta) => {
    setPending((n) => {
      const next = n + delta;
      onBusyChange?.(next > 0);
      return next;
    });
  };

  const onFiles = async (e) => {
    const files = [...(e.target.files ?? [])].slice(0, Math.max(0, MAX_IMAGES - images.length));
    e.target.value = '';
    if (!files.length) return;
    setError('');
    setBusy(files.length);
    // نرفعها وحدة وحدة عشان ما نثقل الجوال
    for (const file of files) {
      try {
        const { full, thumb, previewUrl, fullUrl } = await processImage(file, SITE.shortName);
        const fd = new FormData();
        fd.append('full', full);
        fd.append('thumb', thumb);
        const result = await uploadOfferImage(fd);
        if (!result?.ok) throw new Error(result?.message);
        onChange((list) => [...list, { ...result.image, preview: previewUrl, fullPreview: fullUrl, saved: false }]);
      } catch (err) {
        setError(err?.message || 'ما قدرت أرفع إحدى الصور');
      } finally {
        setBusy(-1);
      }
    }
  };

  const move = (index, delta) => {
    onChange((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (index) => {
    const img = images[index];
    if (!img) return;
    onRemoveSaved(img);
    onChange((list) => list.filter((x) => x.image_path !== img.image_path));
  };

  return (
    <div className="images">
      <div className="images__grid">
        <button
          type="button"
          className="images__add"
          onClick={() => inputRef.current?.click()}
          disabled={images.length >= MAX_IMAGES}
        >
          <UploadIcon />
          <span>{pending ? `جاري الرفع (${pending})…` : 'رفع صور'}</span>
        </button>
        {images.map((img, i) => (
          <figure key={img.image_path} className="images__item">
            <button type="button" className="images__view" onClick={() => setViewing(i)} aria-label={`عرض الصورة ${i + 1}`}>
              <img src={img.preview} alt="" width={160} height={120} decoding="async" />
            </button>
            {i === 0 ? <span className="images__badge">الغلاف</span> : null}
            <button
              type="button"
              className="images__remove"
              onClick={() => remove(i)}
              aria-label={`حذف الصورة ${i + 1}`}
            >
              ×
            </button>
            <div className="images__order">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="قدّم الصورة">
                <ChevronIcon />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label="أخّر الصورة"
              >
                <ChevronIcon style={{ rotate: '180deg' }} />
              </button>
            </div>
          </figure>
        ))}
      </div>
      {viewing != null ? (
        <Lightbox
          images={images}
          index={viewing}
          onClose={() => setViewing(null)}
          onNavigate={(d) => setViewing((i) => Math.min(Math.max(i + d, 0), images.length - 1))}
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFiles}
      />
      <p className="field-hint">
        العلامة المائية &quot;{SITE.shortName}&quot; تنضاف تلقائياً. بدون صور يطلع الغلاف الأخضر. أول صورة هي الغلاف.
      </p>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

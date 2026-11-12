'use client';

import { useRef, useState } from 'react';
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
export default function ImagePicker({ images, onChange, onRemoveSaved, onBusyChange }) {
  const inputRef = useRef(null);
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
        const { full, thumb, previewUrl } = await processImage(file, SITE.shortName);
        const fd = new FormData();
        fd.append('full', full);
        fd.append('thumb', thumb);
        const result = await uploadOfferImage(fd);
        if (!result?.ok) throw new Error(result?.message);
        onChange((list) => [...list, { ...result.image, preview: previewUrl, saved: false }]);
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
            <img src={img.preview} alt={`صورة ${i + 1}`} width={160} height={120} decoding="async" />
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

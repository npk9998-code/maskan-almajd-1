'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, ShareIcon } from '@/components/Icons';
import { offerShareText } from '@/lib/admin/share-text';

const ITEMS = [
  { key: 'text', label: 'رسالة نصية' },
  { key: 'story', label: 'صورة ستوري (سناب وإنستقرام)' },
  { key: 'post', label: 'صورة بوست مربع' },
  { key: 'carousel', label: 'مجموعة صور (تيك توك)' },
];

// زر المشاركة: نص أو صور جاهزة لمواقع التواصل
export default function ShareMenu({ offer, siteUrl, whatsappNumber, onMessage }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shareText = async () => {
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
      onMessage('انتسخت رسالة العرض ✓');
    } catch {
      window.prompt('انسخ الرسالة:', text);
    }
  };

  const run = async (kind) => {
    setOpen(false);
    if (kind === 'text') return shareText();
    setBusy(kind);
    onMessage('جاري تجهيز الصور…');
    try {
      const { makeSocialImages, shareOrDownload } = await import('@/lib/admin/social-image');
      const files = await makeSocialImages(offer, siteUrl, kind, whatsappNumber);
      const result = await shareOrDownload(files);
      onMessage(result === 'downloaded' ? `نزلت ${files.length > 1 ? `${files.length} صور` : 'الصورة'} ✓` : '');
    } catch {
      onMessage('ما قدرت أجهز الصورة، تأكد من الإنترنت وجرّب مرة ثانية');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="share-menu" ref={ref}>
      <button
        type="button"
        className="btn btn--outline btn--icon"
        aria-label={`مشاركة العرض رقم ${offer.id}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={Boolean(busy)}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? <span className="spinner" aria-hidden="true" /> : <ShareIcon />}
      </button>
      {open ? (
        <div className="share-menu__list" role="menu">
          {ITEMS.map((item) => (
            <button key={item.key} type="button" role="menuitem" onClick={() => run(item.key)}>
              {item.key === 'text' ? <ShareIcon className="icon-sm" /> : <ImageIcon className="icon-sm" />}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

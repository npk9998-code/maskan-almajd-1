'use client';

import { useState } from 'react';
import { ShareIcon } from '@/components/Icons';

// يفتح قائمة المشاركة في الجوال، وفي الكمبيوتر ينسخ الرابط
export default function ShareButton({ url, title }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // المستخدم قفل القائمة
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('انسخ رابط العرض:', url);
    }
  };

  return (
    <>
      <button type="button" className="btn btn--outline btn--lg btn--square" aria-label="مشاركة العرض" onClick={share}>
        <ShareIcon />
      </button>
      {copied ? (
        <span className="toast" role="status">
          انتسخ رابط العرض ✓
        </span>
      ) : null}
    </>
  );
}

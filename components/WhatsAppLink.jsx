'use client';

import { trackWhatsapp } from '@/lib/track';

export default function WhatsAppLink({ offerId, href, className, label, children }) {
  return (
    <a
      href={href}
      className={className}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsapp(offerId)}
    >
      {children}
    </a>
  );
}

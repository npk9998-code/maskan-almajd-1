import Link from 'next/link';
import { ChatIcon, HouseIcon } from '@/components/Icons';
import { GENERAL_WHATSAPP_TEXT, whatsappLink } from '@/lib/format';
import { SITE, getWhatsAppNumber } from '@/lib/site';

export default function SiteHeader() {
  const href = whatsappLink(getWhatsAppNumber(), GENERAL_WHATSAPP_TEXT);
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          {/* مكان الشعار — يتبدل بملف الشعار لاحقاً */}
          <span className="brand__logo" aria-hidden="true">
            <HouseIcon />
          </span>
          <span className="brand__text">
            <span className="brand__name">{SITE.name}</span>
            <span className="brand__tagline">{SITE.tagline}</span>
          </span>
        </Link>
        {href ? (
          <a href={href} className="btn btn--wa btn--icon" aria-label="تواصل معي عبر واتساب" target="_blank" rel="noopener noreferrer">
            <ChatIcon />
          </a>
        ) : null}
      </div>
    </header>
  );
}

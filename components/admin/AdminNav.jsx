'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, InboxIcon, PinIcon } from '@/components/Icons';

// عروضي في النص
const ITEMS = [
  { href: '/admin/requests', label: 'الطلبات', Icon: InboxIcon, tour: 'nav-requests' },
  { href: '/admin', label: 'عروضي', Icon: HouseIcon, tour: 'nav-offers' },
  { href: '/admin/cities', label: 'المدن', Icon: PinIcon, tour: 'nav-cities' },
];

export default function AdminNav({ requests = 0 }) {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="تنقل لوحة التحكم">
      {ITEMS.map(({ href, label, Icon, tour }) => {
        const active = href === '/admin' ? pathname === '/admin' || pathname === '/admin/trash' || pathname === '/admin/reports' : pathname.startsWith(href);
        const badge = href === '/admin/requests' && requests > 0 ? requests : 0;
        return (
          <Link
            key={href}
            href={href}
            data-tour={tour}
            className={active ? 'admin-nav__item is-active' : 'admin-nav__item'}
            aria-current={active ? 'page' : undefined}
            aria-label={badge ? `${label}، ${badge} جديد` : undefined}
          >
            <span className="admin-nav__icon">
              <Icon />
              {badge ? <span className="admin-nav__badge tabular">{badge > 99 ? '99+' : badge}</span> : null}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

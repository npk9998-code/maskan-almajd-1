'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, PinIcon } from '@/components/Icons';

const ITEMS = [
  { href: '/admin', label: 'العروض', Icon: HouseIcon },
  { href: '/admin/cities', label: 'المدن', Icon: PinIcon },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="تنقل لوحة التحكم">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'admin-nav__item is-active' : 'admin-nav__item'}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

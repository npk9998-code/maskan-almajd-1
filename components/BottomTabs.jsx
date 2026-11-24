'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HouseIcon, MapIcon } from '@/components/Icons';

const TABS = [
  { href: '/', label: 'العروض', Icon: HouseIcon, tour: 'offers-tab' },
  { href: '/map', label: 'الخريطة', Icon: MapIcon, tour: 'map-tab' },
];

export default function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="bottom-tabs" aria-label="التنقل">
      {TABS.map(({ href, label, Icon, tour }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            data-tour={tour}
            className={active ? 'bottom-tabs__item is-active' : 'bottom-tabs__item'}
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

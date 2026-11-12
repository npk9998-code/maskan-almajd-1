import { SITE } from '@/lib/site';

export default function manifest() {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: 'عروض عقارية مختارة',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#F6F5F1',
    theme_color: '#0F5C4D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

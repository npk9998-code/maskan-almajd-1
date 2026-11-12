import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { SITE, getSiteUrl } from '@/lib/site';
import './globals.css';

const plex = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex',
});

const DESCRIPTION = 'عروض عقارية مختارة. تصفّح العروض وتواصل معي مباشرة عبر واتساب.';

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  description: DESCRIPTION,
  applicationName: SITE.name,
  appleWebApp: { title: SITE.shortName, capable: true, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    siteName: SITE.name,
    title: SITE.name,
    description: DESCRIPTION,
    url: '/',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: DESCRIPTION, images: ['/og.jpg'] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F5C4D',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body>{children}</body>
    </html>
  );
}

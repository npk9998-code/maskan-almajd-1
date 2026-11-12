import './admin.css';

export const metadata = {
  title: { default: 'لوحة التحكم', template: '%s | لوحة التحكم' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return <div className="admin">{children}</div>;
}

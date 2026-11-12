import { requireAdmin } from '@/lib/admin/session';

// صفحات النموذج: محمية، وبدون الشريط السفلي (فيها زر حفظ ثابت)
export default async function AdminFormLayout({ children }) {
  await requireAdmin('/admin');
  return children;
}

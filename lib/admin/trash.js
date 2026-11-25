// تنظيف السلة تلقائياً: العروض بعد ٣٠ يوم، والطلبات المرفوضة بعد ٧ أيام (السيرفر بس)
import { adminDelete, adminSelect, storageRemove } from '@/lib/admin/api';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';

export const OFFER_TRASH_DAYS = 30;
export const REQUEST_TRASH_DAYS = 7;

const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

export async function purgeExpired(token) {
  const [offers, requests] = await Promise.all([
    adminSelect(
      `listings?select=id,images:listing_images(image_path,thumb_path)&deleted_at=lt.${daysAgo(OFFER_TRASH_DAYS)}&limit=50`,
      token,
    ),
    adminSelect(`submissions?select=id,images&status=eq.rejected&rejected_at=lt.${daysAgo(REQUEST_TRASH_DAYS)}&limit=50`, token),
  ]);
  if (offers.length) {
    const paths = offers.flatMap((o) => (o.images ?? []).flatMap((img) => [img.image_path, img.thumb_path]));
    await adminDelete(`listings?id=in.(${offers.map((o) => o.id).join(',')})`, token);
    await storageRemove(paths, token).catch(() => {});
  }
  if (requests.length) {
    const paths = requests.flatMap((r) => (Array.isArray(r.images) ? r.images : []).flatMap((img) => [img.image_path, img.thumb_path]));
    await adminDelete(`submissions?id=in.(${requests.map((r) => r.id).join(',')})`, token);
    await storageRemove(paths, token).catch(() => {});
  }
}

// كم مستهلك من مساحة الصور (بالبايت)
export async function getStorageUsage(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/storage_usage`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const value = await res.json();
  return typeof value === 'number' ? value : value == null ? null : Number(value);
}

// بيانات المدن والأحياء للنموذج (كل المدن، حتى المطفية)
import { adminSelect } from '@/lib/admin/api';

export async function getLocations(token) {
  const [cities, districts, used] = await Promise.all([
    adminSelect('cities?select=id,name,is_visible&order=sort_order.asc,name.asc', token),
    adminSelect('districts?select=id,name,direction,city_id&order=name.asc', token),
    adminSelect('listings?select=custom_type&property_type=eq.other', token),
  ]);
  // الأنواع اللي كتبتها قبل تطلع في الاقتراحات
  const usedTypes = [...new Set(used.map((r) => r.custom_type).filter(Boolean))];
  return { cities, districts, usedTypes };
}

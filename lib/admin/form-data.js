// بيانات المدن والأحياء للنموذج (كل المدن، حتى المطفية)
import { adminSelect } from '@/lib/admin/api';

export async function getLocations(token) {
  const [cities, districts] = await Promise.all([
    adminSelect('cities?select=id,name,is_visible&order=sort_order.asc,name.asc', token),
    adminSelect('districts?select=id,name,direction,city_id&order=name.asc', token),
  ]);
  return { cities, districts };
}

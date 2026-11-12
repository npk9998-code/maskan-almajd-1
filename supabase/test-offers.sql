-- =====================================================================
--  مسكن المجد — عروض تجريبية (الجزء 3)
--  الصق الملف كامل في Supabase > SQL Editor ثم Run
--  تقدر تحذفها كلها بعدين بملف حذف أرسله لك
-- =====================================================================

-- 1) العروض (ترتيب الإضافة = رقم العرض من 101)
insert into public.listings
  (property_type, district_id, price, price_display, area, rooms, bathrooms,
   property_age_years, facade, street_width, floor, features, description, status, created_at)
select v.t, d.id, v.price, v.pd, v.area, v.rooms, v.baths, v.age, v.facade, v.street, v.floor,
       v.features, v.descr, v.status, now() - make_interval(days => v.days_ago)
from (values
  (1, 'villa','الرياض','النرجس', 2450000,'negotiable',375,5,4,0,'شمالية',20,null::int,
   array['مجلس رجال','غرفة خادمة','مصعد','حوش','مكيفات راكبة','مطبخ راكب'],
   'فيلا جديدة بتشطيب فاخر، قريبة من الخدمات والمدارس، ومداخلها مستقلة.','available',1),
  (2, 'apartment','الرياض','الملقا', 1150000,'hidden',180,3,2,0,'شمالية',null,2,
   array['مصعد','موقف خاص','مكيفات راكبة','مطبخ راكب'],
   'شقة جديدة في عمارة حديثة، إطلالة مفتوحة وتشطيب ممتاز.','available',2),
  (3, 'villa','الرياض','العارض', 1150000,'show',300,4,3,3,'شرقية',15,null,
   array['مجلس رجال','حوش','مطبخ راكب'],
   'فيلا دورين وملحق، حالتها ممتازة.','sold',20),
  (4, 'land','الرياض','الياسمين', 1800000,'show',600,null,null,null,'جنوبية',25,null,
   array['على شارعين','سكني'],
   'أرض سكنية في موقع مميز، قريبة من الطرق الرئيسية.','available',3),
  (5, 'apartment','جدة','الشاطئ', 950000,'negotiable',150,3,2,2,'غربية',null,4,
   array['مصعد','موقف خاص','مكيفات راكبة'],
   'شقة قريبة من الكورنيش، إضاءة طبيعية ممتازة.','available',4),
  (6, 'villa','مكة المكرمة','العوالي', 3100000,'hidden',420,6,5,5,'شمالية',18,null,
   array['مجلس رجال','غرفة خادمة','غرفة سائق','حوش','مسبح'],
   'فيلا واسعة مع مسبح وحديقة، مناسبة للعوائل الكبيرة.','available',10),
  (7, 'apartment','الرياض','الملز', 620000,'show',140,3,2,8,'جنوبية',null,1,
   array['موقف خاص','مطبخ راكب'],
   'شقة في حي هادئ وسط الرياض، قريبة من كل الخدمات.','available',14),
  (8, 'land','جدة','أبحر الشمالية', 3200000,'negotiable',900,null,null,null,'شمالية',30,null,
   array['قريبة من البحر','سكني'],
   'أرض كبيرة بالقرب من البحر، مناسبة لبناء فيلا أو استراحة.','available',17),
  (9, 'villa','الرياض','النسيم الشرقي', 1350000,'show',312,5,4,10,'غربية',15,null,
   array['مجلس رجال','حوش'],
   'فيلا بحالة جيدة، مناسبة للسكن أو الاستثمار.','available',21),
  (10,'villa','جدة','السامر', 2100000,'negotiable',400,6,5,1,'شرقية',20,null,
   array['مجلس رجال','غرفة خادمة','مصعد','مكيفات راكبة'],
   'فيلا حديثة بتصميم عصري ومساحات واسعة.','available',5),
  (11,'land','مكة المكرمة','الشرائع', 900000,'hidden',500,null,null,null,'شرقية',20,null,
   array['سكني'],
   'أرض سكنية في مخطط معتمد.','available',25),
  (12,'apartment','مكة المكرمة','العزيزية', 780000,'show',160,4,3,4,'شمالية',null,3,
   array['مصعد','مكيفات راكبة','مطبخ راكب'],
   'شقة واسعة قريبة من الطرق الرئيسية.','available',12),
  -- عرض مخفي للتجربة: لازم ما يطلع في الموقع أبداً
  (13,'villa','الرياض','حطين', 5000000,'show',500,7,6,0,'شمالية',30,null,
   array['مسبح'],
   'عرض مخفي للتجربة.','hidden',0)
) as v(n, t, city, district, price, pd, area, rooms, baths, age, facade, street, floor, features, descr, status, days_ago)
join public.cities c on c.name = v.city
join public.districts d on d.city_id = c.id and d.name = v.district
order by v.n;

-- 2) الصور التجريبية (من ملفات الموقع نفسه)
insert into public.listing_images (listing_id, image_path, sort_order)
select l.id, v.path, v.ord
from (values
  ('النرجس', '/samples/villa-exterior.svg', 0),
  ('النرجس', '/samples/living-room.svg', 1),
  ('النرجس', '/samples/kitchen.svg', 2),
  ('العارض', '/samples/villa-exterior-2.svg', 0),
  ('العارض', '/samples/living-room.svg', 1),
  ('الشاطئ', '/samples/apartment-building.svg', 0),
  ('الشاطئ', '/samples/living-room.svg', 1),
  ('أبحر الشمالية', '/samples/land.svg', 0),
  ('السامر', '/samples/villa-exterior-2.svg', 0),
  ('السامر', '/samples/kitchen.svg', 1),
  ('العزيزية', '/samples/apartment-building.svg', 0),
  ('العزيزية', '/samples/kitchen.svg', 1)
) as v(district, path, ord)
join public.districts d on d.name = v.district
join public.listings l on l.district_id = d.id;

-- 3) ملاحظة خاصة للتجربة: لازم ما تطلع في الموقع أبداً
insert into public.private_notes (listing_id, notes)
select l.id, 'سري-للتجربة: رقم المالك 0500000000 والموقع شارع التجربة'
from public.listings l
join public.districts d on d.id = l.district_id
where d.name = 'النرجس';

-- النتيجة
select id, property_type, status, price_display from public.listings order by id;

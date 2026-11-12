-- =====================================================================
--  مسكن المجد — نسخة احتياطية لكل البيانات في ملف واحد
--  شغّله في SQL Editor، وبعدين: Export > Download JSON
-- =====================================================================
select json_build_object(
  'backup_date',    now(),
  'cities',         (select coalesce(json_agg(c order by c.id), '[]') from public.cities c),
  'districts',      (select coalesce(json_agg(d order by d.id), '[]') from public.districts d),
  'listings',       (select coalesce(json_agg(l order by l.id), '[]') from public.listings l),
  'listing_images', (select coalesce(json_agg(i order by i.listing_id, i.sort_order), '[]') from public.listing_images i),
  'private_notes',  (select coalesce(json_agg(n order by n.listing_id), '[]') from public.private_notes n)
) as backup;

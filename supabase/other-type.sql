-- =====================================================================
--  مسكن المجد — نوع عقار "أخرى" مكتوب يدوي (عمارة، محطة بنزين…)
--  الصق الملف كامل في SQL Editor ثم Run
-- =====================================================================
alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings
  add constraint listings_property_type_check
  check (property_type in ('villa','apartment','land','other'));

alter table public.listings add column if not exists custom_type text;
alter table public.listings drop constraint if exists listings_custom_type_check;
alter table public.listings
  add constraint listings_custom_type_check
  check (
    (property_type = 'other' and custom_type is not null and char_length(custom_type) between 1 and 40)
    or (property_type <> 'other' and custom_type is null)
  );

-- الزائر يقدر يقرا اسم النوع
grant select (custom_type) on public.listings to anon;

select 'تم ✅' as result;

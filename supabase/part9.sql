-- =====================================================================
--  مسكن المجد — الدفعة الكبيرة (فرصة، نزل السعر، جديد، المفضلة، بيانات المالك،
--  المناطق، دمج الدرعية والدمام، التقارير)
--  الصق الملف كامل في SQL Editor ثم Run (آمن لو شغلته مرتين)
-- =====================================================================

-- ١) أعمدة جديدة للعروض
alter table public.listings add column if not exists is_featured     boolean not null default false;  -- فرصة
alter table public.listings add column if not exists admin_favorite  boolean not null default false;  -- قلب المدير (خاص)
alter table public.listings add column if not exists published_at    timestamptz;                       -- وقت النشر (لشارة جديد)
alter table public.listings add column if not exists previous_price  numeric(14,2);                     -- السعر قبل التخفيض
alter table public.listings add column if not exists price_dropped_at timestamptz;                      -- متى نزل السعر

-- العروض الحالية: وقت النشر = وقت الإضافة
update public.listings set published_at = created_at
where published_at is null and status in ('available','sold');

-- السعر القديم يطلع للزائر بس إذا السعر ظاهر (عشان ما ينكشف السعر المخفي)
alter table public.listings add column if not exists public_previous_price numeric(14,2)
  generated always as (case when price_display <> 'hidden' then previous_price end) stored;

-- الزائر يشوف هذي الأعمدة (المفضلة والسعر القديم الأصلي يبقون خاصين)
grant select (is_featured, published_at, public_previous_price, price_dropped_at) on public.listings to anon;

-- وقت النشر + نزل السعر + حد الفرص (٨) تلقائياً
create or replace function public.listing_auto_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'available' and new.published_at is null then
    new.published_at := now();
  end if;

  if tg_op = 'UPDATE' then
    if new.price is not null and old.price is not null and new.price < old.price then
      new.previous_price := old.price;
      new.price_dropped_at := now();
    elsif new.price is distinct from old.price and (new.price is null or new.price > coalesce(new.previous_price, 0)) then
      new.previous_price := null;
      new.price_dropped_at := null;
    end if;
  end if;

  if new.is_featured and (tg_op = 'INSERT' or not old.is_featured) then
    if (select count(*) from public.listings l
        where l.is_featured and l.deleted_at is null and l.id <> coalesce(new.id, -1)) >= 8 then
      raise exception 'featured_limit';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists listings_auto_fields on public.listings;
create trigger listings_auto_fields before insert or update on public.listings
  for each row execute function public.listing_auto_fields();

-- ٢) بيانات المالك في الملاحظات الخاصة (للمدير بس)
alter table public.private_notes add column if not exists owner_name  text check (owner_name is null or char_length(owner_name) <= 80);
alter table public.private_notes add column if not exists owner_phone text check (owner_phone is null or owner_phone ~ '^[0-9+ ]{7,16}$');

-- ٣) المناطق الإدارية
create table if not exists public.regions (
  id    smallint primary key,
  name  text not null unique
);
insert into public.regions (id, name) values
    (1,'منطقة الرياض'),
    (2,'منطقة مكة المكرمة'),
    (3,'منطقة المدينة المنورة'),
    (4,'منطقة القصيم'),
    (5,'المنطقة الشرقية'),
    (6,'منطقة عسير'),
    (7,'منطقة تبوك'),
    (8,'منطقة حائل'),
    (9,'منطقة الحدود الشمالية'),
    (10,'منطقة جازان'),
    (11,'منطقة نجران'),
    (12,'منطقة الباحة'),
    (13,'منطقة الجوف')
on conflict (id) do update set name = excluded.name;
alter table public.regions enable row level security;
grant select on public.regions to anon, authenticated;
drop policy if exists "everyone reads regions" on public.regions;
create policy "everyone reads regions" on public.regions for select to anon, authenticated using (true);

alter table public.cities add column if not exists region_id smallint references public.regions(id);
update public.cities c set region_id = r.id
from (values
    ('تبوك','منطقة تبوك'),
    ('الرياض','منطقة الرياض'),
    ('الطائف','منطقة مكة المكرمة'),
    ('مكة المكرمة','منطقة مكة المكرمة'),
    ('حائل','منطقة حائل'),
    ('بريدة','منطقة القصيم'),
    ('الهفوف','المنطقة الشرقية'),
    ('الدمام','المنطقة الشرقية'),
    ('المدينة المنورة','منطقة المدينة المنورة'),
    ('أبها','منطقة عسير'),
    ('جازان','منطقة جازان'),
    ('جدة','منطقة مكة المكرمة'),
    ('المجمعة','منطقة الرياض'),
    ('حقل','منطقة تبوك'),
    ('حفر الباطن','المنطقة الشرقية'),
    ('القيصومة','المنطقة الشرقية'),
    ('خميس مشيط','منطقة عسير'),
    ('احد رفيده','منطقة عسير'),
    ('تيماء','منطقة تبوك'),
    ('عنيزة','منطقة القصيم'),
    ('قرية العليا','المنطقة الشرقية'),
    ('الجبيل','المنطقة الشرقية'),
    ('النعيرية','المنطقة الشرقية'),
    ('حرمة','منطقة الرياض'),
    ('جلاجل','منطقة الرياض'),
    ('حوطة سدير','منطقة الرياض'),
    ('تمير','منطقة الرياض'),
    ('الارطاوية','منطقة الرياض'),
    ('العلا','منطقة المدينة المنورة'),
    ('الوجه','منطقة تبوك'),
    ('بقيق','المنطقة الشرقية'),
    ('طريب','منطقة عسير'),
    ('الزلفي','منطقة الرياض'),
    ('خيبر','منطقة المدينة المنورة'),
    ('الغاط','منطقة الرياض'),
    ('املج','منطقة تبوك'),
    ('مهد الذهب','منطقة المدينة المنورة'),
    ('رابغ','منطقة مكة المكرمة'),
    ('عفيف','منطقة الرياض'),
    ('ثادق','منطقة الرياض'),
    ('تاروت','المنطقة الشرقية'),
    ('ينبع','منطقة المدينة المنورة'),
    ('شقراء','منطقة الرياض'),
    ('القصب','منطقة الرياض'),
    ('الدوادمي','منطقة الرياض'),
    ('نفي','منطقة الرياض'),
    ('البجادية','منطقة الرياض'),
    ('الحناكية','منطقة المدينة المنورة'),
    ('حريملاء','منطقة الرياض'),
    ('العيينة','منطقة الرياض'),
    ('ضرما','منطقة الرياض'),
    ('القويعية','منطقة الرياض'),
    ('الرويضة','منطقة الرياض'),
    ('قبة','منطقة القصيم'),
    ('الحصاة','منطقة الرياض'),
    ('الرين','منطقة الرياض'),
    ('المزاحمية','منطقة الرياض'),
    ('بدر','منطقة المدينة المنورة'),
    ('الخرج','منطقة الرياض'),
    ('الدلم','منطقة الرياض'),
    ('خليص','منطقة مكة المكرمة'),
    ('الشنان','منطقة حائل'),
    ('الخرمة','منطقة مكة المكرمة'),
    ('الجموم','منطقة مكة المكرمة'),
    ('المجاردة','منطقة عسير'),
    ('وادي الدواسر','منطقة الرياض'),
    ('السليل','منطقة الرياض'),
    ('الليث','منطقة مكة المكرمة'),
    ('تثليث','منطقة عسير'),
    ('بيشة','منطقة عسير'),
    ('بلجرشي','منطقة الباحة'),
    ('الباحة','منطقة الباحة'),
    ('القنفذة','منطقة مكة المكرمة'),
    ('سبت العلاية','منطقة عسير'),
    ('القوز','منطقة مكة المكرمة'),
    ('محايل','منطقة عسير'),
    ('السودة','منطقة عسير'),
    ('ثول','منطقة مكة المكرمة'),
    ('ضبا','منطقة تبوك'),
    ('الاسياح','منطقة القصيم'),
    ('عيون الجواء','منطقة القصيم'),
    ('العيون','المنطقة الشرقية'),
    ('تربه','منطقة مكة المكرمة'),
    ('صفوى','المنطقة الشرقية'),
    ('الجش','المنطقة الشرقية'),
    ('عنك','المنطقة الشرقية'),
    ('دارين','المنطقة الشرقية'),
    ('طريف','منطقة الحدود الشمالية'),
    ('عرعر','منطقة الحدود الشمالية'),
    ('العويقلية','منطقة الحدود الشمالية'),
    ('القريات','منطقة الجوف'),
    ('العيساوية','منطقة الجوف'),
    ('صوير','منطقة الجوف'),
    ('سكاكا','منطقة الجوف'),
    ('طبرجل','منطقة الجوف'),
    ('رفحاء','منطقة الحدود الشمالية'),
    ('دومة الجندل','منطقة الجوف'),
    ('الأضارع','منطقة الجوف'),
    ('الشملي','منطقة حائل'),
    ('بقعاء','منطقة حائل'),
    ('الرس','منطقة القصيم'),
    ('المذنب','منطقة القصيم'),
    ('الخفجي','المنطقة الشرقية'),
    ('رياض الخبراء','منطقة القصيم'),
    ('البدائع','منطقة القصيم'),
    ('الخبراء','منطقة القصيم'),
    ('النماص','منطقة عسير'),
    ('يدمة','منطقة نجران'),
    ('راس تنورة','المنطقة الشرقية'),
    ('الهلالية','منطقة القصيم'),
    ('البكيرية','منطقة القصيم'),
    ('يبرين','المنطقة الشرقية'),
    ('العمران','المنطقة الشرقية'),
    ('المبرز','المنطقة الشرقية'),
    ('الجفر','المنطقة الشرقية'),
    ('الشماسية','منطقة القصيم'),
    ('رنية','منطقة مكة المكرمة'),
    ('العقيق','منطقة الباحة'),
    ('طبب','منطقة عسير'),
    ('عقلة الصقور','منطقة القصيم'),
    ('النبهانية','منطقة القصيم'),
    ('ضرية','منطقة القصيم'),
    ('الحريق','منطقة الرياض'),
    ('حوطة بني تميم','منطقة الرياض'),
    ('الحلوة','منطقة الرياض'),
    ('ليلى','منطقة الرياض'),
    ('تنومة','منطقة عسير'),
    ('بللسمر','منطقة عسير'),
    ('سراة عبيدة','منطقة عسير'),
    ('شرورة','منطقة نجران'),
    ('ظهران الجنوب','منطقة عسير'),
    ('الحرجة','منطقة عسير'),
    ('حبونا','منطقة نجران'),
    ('نجران','منطقة نجران'),
    ('صبيا','منطقة جازان'),
    ('ابو عريش','منطقة جازان'),
    ('صامطة','منطقة جازان'),
    ('العارضة','منطقة جازان'),
    ('احد المسارحة','منطقة جازان'),
    ('مدينة الملك عبدالله الاقتصادية','منطقة مكة المكرمة'),
    ('تندحة','منطقة عسير'),
    ('بللحمر','منطقة عسير'),
    ('جواثا','المنطقة الشرقية'),
    ('ينبع الصناعية','منطقة المدينة المنورة'),
    ('المرموثة','منطقة القصيم'),
    ('ام الحمام','المنطقة الشرقية'),
    ('العرضية الشمالية','منطقة مكة المكرمة')
) as v(city, region)
join public.regions r on r.name = v.region
where c.name = v.city and c.region_id is null;
grant select (region_id) on public.cities to anon;

-- ٤) دمج الدرعية مع الرياض، والخبر والظهران والقطيف وسيهات مع الدمام
insert into public.districts (city_id, name, direction)
select c.id, v.name, v.direction
from public.cities c
cross join (values
    ('الشهداء','north'),
    ('الفيصلية','south'),
    ('الخالدية','south'),
    ('سلطانة','south'),
    ('الملقا','north'),
    ('الملقا (الدرعية)','north'),
    ('الفيصلية (الدرعية)','west'),
    ('الثليما','west'),
    ('السلمانية','west'),
    ('الملك','west'),
    ('الدرعية','west'),
    ('الخالدية (الدرعية)','west'),
    ('العاصمة','west'),
    ('الطريف','west'),
    ('الروقية','west'),
    ('السرحية','west'),
    ('الشهداء (الدرعية)','west'),
    ('ظهرة العودة غرب','west'),
    ('البليدا','west'),
    ('العلب','west'),
    ('سلطانة (الدرعية)','north'),
    ('ظهرة العودة شرق','west')
) as v(name, direction)
where c.name = 'الرياض'
on conflict (city_id, name) do nothing;

insert into public.districts (city_id, name, direction)
select c.id, v.name, v.direction
from public.cities c
cross join (values
    ('النور','west'),
    ('السلام','center'),
    ('الزهور','center'),
    ('الصناعية','west'),
    ('الخليج','center'),
    ('الروضة','south'),
    ('غرناطة','center'),
    ('الفردوس','south'),
    ('مدينة العمال','center'),
    ('البديع','center'),
    ('الحمراء','center'),
    ('البحيرة','west'),
    ('الجوهرة','north'),
    ('الواحة','south'),
    ('الاسكان','center'),
    ('النسيم','north'),
    ('المها','west'),
    ('التحلية','south'),
    ('ابن سيناء','south'),
    ('الحزام الاخضر','south'),
    ('صناعية الثقبة','south'),
    ('التعاون','south'),
    ('الراكة الجنوبية','south'),
    ('الخبر الشمالية','south'),
    ('مدينة العمال (الخبر)','south'),
    ('العقربية','south'),
    ('الخبر الجنوبية','south'),
    ('الروابي','south'),
    ('اليرموك','south'),
    ('قرطبة','south'),
    ('الجوهرة (الخبر)','south'),
    ('الحزام الذهبي','south'),
    ('الاندلس','south'),
    ('الهدا','south'),
    ('البندرية','south'),
    ('البستان','south'),
    ('الثقبة','south'),
    ('العليا','south'),
    ('الاسكان (الخبر)','south'),
    ('الحمراء (الخبر)','south'),
    ('الجسر','south'),
    ('الخزامى','south'),
    ('المدينة الرياضية','south'),
    ('البحر','south'),
    ('الكورنيش','south'),
    ('صناعية الفوازية','south'),
    ('الساحل','south'),
    ('الخور','south'),
    ('اشبيليا','south'),
    ('البحيرة (الخبر)','south'),
    ('الشراع','south'),
    ('الكوثر','south'),
    ('الرجاء','south'),
    ('الصواري','south'),
    ('العقيق','south'),
    ('المها (الخبر)','south'),
    ('الامواج','south'),
    ('اللؤلؤ','south'),
    ('المرجان','south'),
    ('السفن','south'),
    ('الصدفة','south'),
    ('الدوحة الجنوبية','south'),
    ('الدانة الشمالية','south'),
    ('القصور','south'),
    ('الدوحة الشمالية','south'),
    ('الدانة الجنوبية','south'),
    ('الجامعة','south'),
    ('الحرس الوطني','south'),
    ('تهامة','south'),
    ('القشلة','south'),
    ('هجر','south'),
    ('غرب الظهران','south'),
    ('جامعة الملك فهد للبترول والمعادن','south'),
    ('أجيال','south'),
    ('البديع (القطيف)','north'),
    ('منطقة المستودعات','north'),
    ('المجيدية','north'),
    ('الشاطئ','north'),
    ('الفتح','north'),
    ('الواحة (القطيف)','north'),
    ('المروج','north'),
    ('الصناعية (القطيف)','north'),
    ('الروضة (القطيف)','north'),
    ('الورود','north'),
    ('الرضا','north'),
    ('الجارودية','north'),
    ('حلة محيش','north'),
    ('الياقوت','north'),
    ('البديعة','north'),
    ('الدبابية','north'),
    ('الخامسة','north'),
    ('ام الجزم','north'),
    ('بديعة البصري','north'),
    ('المشتل','north'),
    ('الزمرد','north'),
    ('الناصرة','north'),
    ('البحاري','north'),
    ('مياس','north'),
    ('الجواهر','north'),
    ('الخزامى (القطيف)','north'),
    ('التوبي','north'),
    ('الجراري','north'),
    ('الشهباء','north'),
    ('القديح','north'),
    ('المدارس','north'),
    ('الشماسيه','north'),
    ('باب الساب','north'),
    ('الجميمة','north'),
    ('المسعودية','north'),
    ('الخويلدية','north'),
    ('العوامية','north'),
    ('الدويج','north'),
    ('الرابعة','north'),
    ('البستان (القطيف)','north'),
    ('الجزيرة','north'),
    ('الشريعة','north'),
    ('الوسادة','north'),
    ('القلعة','north'),
    ('البوادي','north'),
    ('الحسين','north'),
    ('المدني','north'),
    ('الثريا','north'),
    ('الريف','north'),
    ('باب الشمال','north'),
    ('البحر (القطيف)','north'),
    ('الشويكة','north'),
    ('الوديعه','north'),
    ('الكويكب','north'),
    ('النرجس','north'),
    ('الزهراء','north'),
    ('الزارة','north'),
    ('النابية','west'),
    ('الديرة','west'),
    ('غرناطة (سيهات)','west'),
    ('الفردوس (سيهات)','west'),
    ('السلام (سيهات)','west'),
    ('قرطبة (سيهات)','north'),
    ('الطف','north'),
    ('الخصاب','north'),
    ('الغدير','north'),
    ('النقى','west'),
    ('المنتزة (سيهات)','north'),
    ('الكوثر (سيهات)','north'),
    ('النسيم (سيهات)','north'),
    ('الخليج (سيهات)','west'),
    ('الزهور (سيهات)','west'),
    ('النور (سيهات)','north'),
    ('غرب النابية','west'),
    ('الصناعية (سيهات)','west')
) as v(name, direction)
where c.name = 'الدمام'
on conflict (city_id, name) do nothing;

-- ٥) إحصائيات يومية للتقارير
create table if not exists public.listing_daily_stats (
  listing_id  bigint not null references public.listings(id) on delete cascade,
  day         date not null,
  views       integer not null default 0,
  people      integer not null default 0,
  whatsapp    integer not null default 0,
  primary key (listing_id, day)
);
create table if not exists public.site_daily_stats (
  day     date primary key,
  visits  integer not null default 0,
  people  integer not null default 0
);
create table if not exists public.search_misses (
  day       date not null,
  city      text not null default '',
  district  text not null default '',
  type      text not null default '',
  budget    bigint not null default 0,
  hits      integer not null default 0,
  primary key (day, city, district, type, budget)
);
alter table public.listing_daily_stats enable row level security;
alter table public.site_daily_stats    enable row level security;
alter table public.search_misses       enable row level security;
revoke all on public.listing_daily_stats, public.site_daily_stats, public.search_misses from anon, authenticated;
grant select on public.listing_daily_stats, public.site_daily_stats, public.search_misses to authenticated;
drop policy if exists "admin reads daily stats" on public.listing_daily_stats;
create policy "admin reads daily stats" on public.listing_daily_stats for select to authenticated using (public.is_admin());
drop policy if exists "admin reads site stats" on public.site_daily_stats;
create policy "admin reads site stats" on public.site_daily_stats for select to authenticated using (public.is_admin());
drop policy if exists "admin reads misses" on public.search_misses;
create policy "admin reads misses" on public.search_misses for select to authenticated using (public.is_admin());

-- نفس دالة التتبع القديمة + تسجيل اليوم
create or replace function public.track_listing_event(p_listing_id bigint, p_event text, p_first boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Riyadh')::date;
begin
  if p_event not in ('view','whatsapp') or not public.listing_is_public(p_listing_id) then
    return;
  end if;
  insert into public.listing_stats as s (listing_id, unique_views, total_views, whatsapp_clicks)
  values (
    p_listing_id,
    case when p_event = 'view' and p_first then 1 else 0 end,
    case when p_event = 'view' then 1 else 0 end,
    case when p_event = 'whatsapp' and p_first then 1 else 0 end
  )
  on conflict (listing_id) do update set
    unique_views    = s.unique_views + excluded.unique_views,
    total_views     = s.total_views + excluded.total_views,
    whatsapp_clicks = s.whatsapp_clicks + excluded.whatsapp_clicks,
    updated_at      = now();

  insert into public.listing_daily_stats as s (listing_id, day, views, people, whatsapp)
  values (
    p_listing_id, v_day,
    case when p_event = 'view' then 1 else 0 end,
    case when p_event = 'view' and p_first then 1 else 0 end,
    case when p_event = 'whatsapp' and p_first then 1 else 0 end
  )
  on conflict (listing_id, day) do update set
    views    = s.views + excluded.views,
    people   = s.people + excluded.people,
    whatsapp = s.whatsapp + excluded.whatsapp;
end $$;

-- زيارة للموقع (مرة لكل جلسة)
create or replace function public.track_site_visit(p_first boolean)
returns void language sql security definer set search_path = '' as $$
  insert into public.site_daily_stats as s (day, visits, people)
  values ((now() at time zone 'Asia/Riyadh')::date, 1, case when p_first then 1 else 0 end)
  on conflict (day) do update set visits = s.visits + 1, people = s.people + excluded.people;
$$;
revoke all on function public.track_site_visit(boolean) from public;
grant execute on function public.track_site_visit(boolean) to anon;

-- بحث ما لقى نتيجة
create or replace function public.log_search_miss(p_city text, p_district text, p_type text, p_budget bigint)
returns void language sql security definer set search_path = '' as $$
  insert into public.search_misses as s (day, city, district, type, budget, hits)
  values (
    (now() at time zone 'Asia/Riyadh')::date,
    left(coalesce(trim(p_city), ''), 40),
    left(coalesce(trim(p_district), ''), 60),
    case when p_type in ('villa','apartment','land','other') then p_type else '' end,
    case when p_budget between 1 and 1000000000000 then (round(p_budget / 100000.0) * 100000)::bigint else 0 end,
    1
  )
  on conflict (day, city, district, type, budget) do update set hits = s.hits + 1;
$$;
revoke all on function public.log_search_miss(text, text, text, bigint) from public;
grant execute on function public.log_search_miss(text, text, text, bigint) to anon;

select 'تم ✅' as result;

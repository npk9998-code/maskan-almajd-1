-- =====================================================================
--  مسكن المجد — طلبات العملاء (اعرض عقارك) + بانتظار النشر + السلة + المساحة
--  الصق الملف كامل في SQL Editor ثم Run (آمن لو شغلته مرتين)
-- =====================================================================

-- ١) حالة جديدة للعروض: بانتظار النشر (ما تطلع للعملاء)
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('available','hidden','sold','pending'));

-- ٢) سلة المحذوفات: العرض المحذوف يبقى ٣٠ يوم وبعدين ينحذف
alter table public.listings add column if not exists deleted_at timestamptz;
create index if not exists listings_deleted_at_idx on public.listings (deleted_at) where deleted_at is not null;

-- العروض المحذوفة ما تطلع للزوار أبداً
drop policy if exists "visitors read shown and sold listings" on public.listings;
create policy "visitors read shown and sold listings" on public.listings
  for select to anon
  using (status in ('available','sold') and deleted_at is null and public.district_in_visible_city(district_id));

create or replace function public.listing_is_public(p_listing_id bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    join public.districts d on d.id = l.district_id
    join public.cities c on c.id = d.city_id
    where l.id = p_listing_id
      and l.status in ('available','sold')
      and l.deleted_at is null
      and c.is_visible
  );
$$;

-- ٣) طلبات العملاء
create table if not exists public.submissions (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  status              text not null default 'new' check (status in ('new','rejected')),
  rejected_at         timestamptz,
  device_id           text check (device_id is null or char_length(device_id) <= 64),
  owner_name          text not null check (char_length(owner_name) between 2 and 60),
  owner_phone         text not null check (owner_phone ~ '^05[0-9]{8}$'),
  property_type       text not null check (property_type in ('villa','apartment','land','other')),
  custom_type         text check (custom_type is null or char_length(custom_type) between 1 and 40),
  city                text not null check (char_length(city) between 2 and 40),
  district            text not null check (char_length(district) between 2 and 60),
  area                numeric(10,2) not null check (area > 0 and area < 100000000),
  price               numeric(14,2) check (price is null or (price >= 0 and price < 1e12)),
  rooms               smallint check (rooms is null or rooms between 0 and 200),
  bathrooms           smallint check (bathrooms is null or bathrooms between 0 and 200),
  property_age_years  smallint check (property_age_years is null or property_age_years between 0 and 200),
  facade              text check (facade is null or char_length(facade) <= 40),
  street_width        numeric(5,1) check (street_width is null or (street_width > 0 and street_width < 1000)),
  floor               smallint check (floor is null or floor between 0 and 200),
  description         text check (description is null or char_length(description) <= 1000),
  deed_number         text check (deed_number is null or char_length(deed_number) <= 30),
  images              jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 10),
  consent_at          timestamptz not null
);
create index if not exists submissions_status_created_idx on public.submissions (status, created_at desc);
create index if not exists submissions_phone_idx on public.submissions (owner_phone, created_at desc);
create index if not exists submissions_device_idx on public.submissions (device_id, created_at desc);

alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
-- الزائر ما يقدر يقرا أي طلب، يرسل بس عن طريق الدالة تحت
grant select, update, delete on public.submissions to authenticated;
drop policy if exists "admin manages submissions" on public.submissions;
create policy "admin manages submissions" on public.submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- إرسال طلب: فحص البيانات + حد ٣ طلبات باليوم لنفس الجوال أو الجهاز
create or replace function public.submit_property(p jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone  text := trim(coalesce(p->>'owner_phone', ''));
  v_device text := left(coalesce(p->>'device_id', ''), 64);
  v_city   text := trim(coalesce(p->>'city', ''));
  v_type   text := coalesce(p->>'property_type', '');
  v_images jsonb := coalesce(p->'images', '[]'::jsonb);
  v_img    jsonb;
  v_id     bigint;
begin
  if jsonb_typeof(v_images) <> 'array' or jsonb_array_length(v_images) > 10 then
    raise exception 'bad_images';
  end if;
  for v_img in select * from jsonb_array_elements(v_images) loop
    if coalesce(v_img->>'image_path', '') !~ '^submissions/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.(jpg|webp|png)$'
       or coalesce(v_img->>'thumb_path', '') !~ '^submissions/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}-thumb\.(jpg|webp|png)$' then
      raise exception 'bad_images';
    end if;
  end loop;

  if not exists (select 1 from public.cities c where c.name = v_city and c.is_visible) then
    raise exception 'bad_city';
  end if;

  if (select count(*) from public.submissions s
      where s.created_at > now() - interval '1 day'
        and (s.owner_phone = v_phone or (v_device <> '' and s.device_id = v_device))) >= 3 then
    raise exception 'limit';
  end if;
  if (select count(*) from public.submissions s where s.created_at > now() - interval '1 hour') >= 40 then
    raise exception 'busy';
  end if;

  insert into public.submissions (
    device_id, owner_name, owner_phone, property_type, custom_type, city, district,
    area, price, rooms, bathrooms, property_age_years, facade, street_width, floor,
    description, deed_number, images, consent_at
  ) values (
    nullif(v_device, ''),
    trim(p->>'owner_name'),
    v_phone,
    v_type,
    case when v_type = 'other' then nullif(trim(p->>'custom_type'), '') end,
    v_city,
    trim(p->>'district'),
    (p->>'area')::numeric,
    nullif(p->>'price', '')::numeric,
    nullif(p->>'rooms', '')::smallint,
    nullif(p->>'bathrooms', '')::smallint,
    nullif(p->>'property_age_years', '')::smallint,
    nullif(trim(p->>'facade'), ''),
    nullif(p->>'street_width', '')::numeric,
    nullif(p->>'floor', '')::smallint,
    nullif(trim(p->>'description'), ''),
    nullif(trim(p->>'deed_number'), ''),
    v_images,
    now()
  )
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_property(jsonb) from public;
grant execute on function public.submit_property(jsonb) to anon, authenticated;

-- ٤) صور الطلبات: الزائر يقدر يرفع بس داخل مجلد submissions (وما يقدر يستبدل أو يحذف)
drop policy if exists "visitors upload submission images" on storage.objects;
create policy "visitors upload submission images" on storage.objects
  for insert to anon
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = 'submissions');

-- ٥) كم مستهلك من مساحة الصور (للمدير بس)
create or replace function public.storage_usage()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_admin()
    then coalesce(sum((o.metadata->>'size')::bigint), 0)
    else null end
  from storage.objects o
  where o.bucket_id = 'listing-images';
$$;
revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated;

select 'تم ✅' as result;

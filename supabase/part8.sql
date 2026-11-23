-- =====================================================================
--  مسكن المجد — المفضلة/سعر المتر/الإحصائيات
--  الصق الملف كامل في SQL Editor ثم Run
-- =====================================================================

-- ١) سعر المتر: خيار لكل عرض
alter table public.listings add column if not exists show_price_per_meter boolean not null default false;
grant select (show_price_per_meter) on public.listings to anon;

-- ٢) الإحصائيات: الأرقام بس، بدون أي بيانات عن الزوار
create table if not exists public.listing_stats (
  listing_id      bigint primary key references public.listings(id) on delete cascade,
  unique_views    integer not null default 0,  -- كل جهاز مرة
  total_views     integer not null default 0,  -- كل مرة ينفتح
  whatsapp_clicks integer not null default 0,  -- كل جهاز مرة
  updated_at      timestamptz not null default now()
);
alter table public.listing_stats enable row level security;
revoke all on public.listing_stats from anon, authenticated;
grant select on public.listing_stats to authenticated;
drop policy if exists "admin reads stats" on public.listing_stats;
create policy "admin reads stats" on public.listing_stats
  for select to authenticated using (public.is_admin());

-- الزائر ما يقدر يعدّل الأرقام مباشرة، بس يزيدها بواحد عن طريق هذي الدالة
create or replace function public.track_listing_event(p_listing_id bigint, p_event text, p_first boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_event not in ('view', 'whatsapp') or not public.listing_is_public(p_listing_id) then
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
end $$;

revoke all on function public.track_listing_event(bigint, text, boolean) from public;
grant execute on function public.track_listing_event(bigint, text, boolean) to anon, authenticated;

select 'تم ✅' as result;

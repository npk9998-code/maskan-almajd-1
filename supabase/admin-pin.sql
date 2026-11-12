-- =====================================================================
--  مسكن المجد — الرمز السري للوحة التحكم (الجزء 4)
--  الصق الملف كامل في Supabase > SQL Editor ثم Run
--  الرمز نفسه تحطه في خطوة منفصلة (آخر الملف)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- مكان خاص ما ينوصل له من الموقع أبداً
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.admin_pin (
  id        integer primary key default 1 check (id = 1),
  pin_hash  text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.admin_login_state (
  id            integer primary key default 1 check (id = 1),
  failed_count  integer not null default 0,
  locked_until  timestamptz
);
insert into private.admin_login_state (id) values (1) on conflict do nothing;

-- فحص الرمز: ٥ محاولات غلط = قفل ١٥ دقيقة
create or replace function public.admin_check_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state private.admin_login_state%rowtype;
  v_hash  text;
  v_max   constant integer := 5;
begin
  select * into v_state from private.admin_login_state where id = 1 for update;

  if v_state.locked_until is not null and v_state.locked_until > now() then
    return jsonb_build_object(
      'ok', false, 'locked', true,
      'retry_after_seconds', ceil(extract(epoch from v_state.locked_until - now()))
    );
  end if;

  select pin_hash into v_hash from private.admin_pin where id = 1;

  if v_hash is not null
     and p_pin ~ '^[0-9]{6}$'
     and extensions.crypt(p_pin, v_hash) = v_hash then
    update private.admin_login_state set failed_count = 0, locked_until = null where id = 1;
    return jsonb_build_object('ok', true);
  end if;

  if v_state.failed_count + 1 >= v_max then
    update private.admin_login_state
       set failed_count = 0, locked_until = now() + interval '15 minutes'
     where id = 1;
    return jsonb_build_object('ok', false, 'locked', true, 'retry_after_seconds', 900);
  end if;

  update private.admin_login_state set failed_count = v_state.failed_count + 1 where id = 1;
  return jsonb_build_object('ok', false, 'remaining', v_max - (v_state.failed_count + 1));
end $$;

revoke all on function public.admin_check_pin(text) from public;
grant execute on function public.admin_check_pin(text) to anon, authenticated;

-- تغيير الرمز: تشغلها أنت بس من SQL Editor
create or replace function private.set_admin_pin(p_pin text)
returns text
language plpgsql
set search_path = ''
as $$
begin
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'الرمز لازم يكون ٦ أرقام بالضبط';
  end if;
  insert into private.admin_pin (id, pin_hash)
  values (1, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (id) do update set pin_hash = excluded.pin_hash, updated_at = now();
  update private.admin_login_state set failed_count = 0, locked_until = null where id = 1;
  return 'تم حفظ الرمز ✅';
end $$;

revoke all on function private.set_admin_pin(text) from public, anon, authenticated;

select 'جاهز ✅ الحين حط الرمز في خطوة منفصلة' as result;

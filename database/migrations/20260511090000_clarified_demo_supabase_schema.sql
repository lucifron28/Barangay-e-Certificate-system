-- Barangay Bato e-Certificate System clarified thesis/demo migration.
-- Apply after confirming the correct Supabase project. This keeps the project
-- aligned with the SQLite demo schema and updated client decisions.

create extension if not exists pgcrypto;
create schema if not exists app_private;

alter table if exists public.profiles
  add column if not exists password_hash text;

alter table if exists public.certificate_requests
  add column if not exists fee_amount integer not null default 0,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists cancelled_at timestamptz;

alter table if exists public.certificate_records
  add column if not exists pdf_path text;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'profiles'
      and constraint_name = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'certificate_requests'
      and constraint_name = 'certificate_requests_status_check'
  ) then
    alter table public.certificate_requests drop constraint certificate_requests_status_check;
  end if;

  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'certificate_requests'
      and constraint_name = 'certificate_requests_payment_status_check'
  ) then
    alter table public.certificate_requests drop constraint certificate_requests_payment_status_check;
  end if;
end $$;

update public.profiles set role = 'main_admin' where role = 'admin';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('resident', 'main_admin', 'barangay_secretary'));

alter table public.certificate_requests
  add constraint certificate_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'ready_for_pickup', 'done', 'cancelled')),
  add constraint certificate_requests_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'free'));

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values
  ('barangay_captain_name', to_jsonb('Barangay Captain Name'::text)),
  ('signature_image_path', 'null'::jsonb),
  ('office_hours', to_jsonb('Monday to Friday, 8:00 AM to 5:00 PM'::text))
on conflict (key) do nothing;

create or replace function app_private.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    app_private.get_current_user_role() in ('main_admin', 'barangay_secretary'),
    false
  );
$$;

create or replace function public.get_current_user_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select role
  from public.profiles
  where auth_user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    public.get_current_user_role() in ('main_admin', 'barangay_secretary'),
    false
  );
$$;

create or replace function app_private.generate_request_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'REQ-' || to_char(now(), 'YYYY') || '-' ||
    lpad((
      count(*) + 1
    )::text, 4, '0')
  from public.certificate_requests
  where request_number like 'REQ-' || to_char(now(), 'YYYY') || '-%';
$$;

create or replace function app_private.generate_clearance_control_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'BCL-' || to_char(now(), 'YYYY') || '-' ||
    lpad((
      count(*) + 1
    )::text, 4, '0')
  from public.certificate_requests
  where control_number like 'BCL-' || to_char(now(), 'YYYY') || '-%';
$$;

create or replace function app_private.certificate_fee(certificate_type text)
returns integer
language sql
immutable
as $$
  select case certificate_type
    when 'barangay_indigency' then 0
    else 50
  end;
$$;

create or replace function app_private.prepare_certificate_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_number is null or new.request_number = '' then
    new.request_number := app_private.generate_request_number();
  end if;

  if new.certificate_type = 'barangay_clearance'
    and (new.control_number is null or new.control_number = '') then
    new.control_number := app_private.generate_clearance_control_number();
  end if;

  new.fee_amount := app_private.certificate_fee(new.certificate_type);
  if new.certificate_type = 'barangay_indigency' then
    new.payment_status := 'free';
  elsif new.payment_status is null or new.payment_status = 'free' then
    new.payment_status := 'unpaid';
  end if;

  return new;
end;
$$;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    auth_user_id,
    full_name,
    age,
    address_sitio,
    date_of_birth,
    civil_status,
    contact_number,
    gender,
    occupation,
    email,
    username,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'age', '')::integer,
    nullif(new.raw_user_meta_data->>'address_sitio', ''),
    nullif(new.raw_user_meta_data->>'date_of_birth', '')::date,
    nullif(new.raw_user_meta_data->>'civil_status', ''),
    nullif(new.raw_user_meta_data->>'contact_number', ''),
    nullif(new.raw_user_meta_data->>'gender', ''),
    nullif(new.raw_user_meta_data->>'occupation', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'username', ''),
    'resident'
  )
  on conflict (auth_user_id) do update
  set
    full_name = excluded.full_name,
    age = excluded.age,
    address_sitio = excluded.address_sitio,
    date_of_birth = excluded.date_of_birth,
    civil_status = excluded.civil_status,
    contact_number = excluded.contact_number,
    gender = excluded.gender,
    occupation = excluded.occupation,
    email = excluded.email,
    username = excluded.username,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists prepare_certificate_request on public.certificate_requests;
create trigger prepare_certificate_request
before insert on public.certificate_requests
for each row execute function app_private.prepare_certificate_request();

drop trigger if exists set_system_settings_updated_at on public.system_settings;
create trigger set_system_settings_updated_at
before update on public.system_settings
for each row execute function app_private.set_updated_at();

alter table public.system_settings enable row level security;

drop policy if exists "Profiles are viewable by owners or admins" on public.profiles;
create policy "Profiles are viewable by owners or admins"
on public.profiles
for select
to authenticated
using (
  auth_user_id = (select auth.uid()) or app_private.is_admin()
);

drop policy if exists "Profiles can be updated by owners or admins" on public.profiles;
drop policy if exists "Residents can update their own profile" on public.profiles;
create policy "Residents can update their own profile"
on public.profiles
for update
to authenticated
using (auth_user_id = (select auth.uid()) and role = 'resident')
with check (auth_user_id = (select auth.uid()) and role = 'resident');

drop policy if exists "Admins can delete profiles" on public.profiles;

drop policy if exists "Admins can update requests" on public.certificate_requests;
create policy "Admin-side users can update requests"
on public.certificate_requests
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Residents can cancel pending requests" on public.certificate_requests;
create policy "Residents can cancel pending requests"
on public.certificate_requests
for update
to authenticated
using (
  resident_id = app_private.current_profile_id()
  and status = 'pending'
)
with check (
  resident_id = app_private.current_profile_id()
  and status = 'cancelled'
);

drop policy if exists "Residents can resubmit rejected requests" on public.certificate_requests;
create policy "Residents can resubmit rejected requests"
on public.certificate_requests
for update
to authenticated
using (
  resident_id = app_private.current_profile_id()
  and status = 'rejected'
)
with check (
  resident_id = app_private.current_profile_id()
  and status = 'pending'
);

drop policy if exists "Admins can view system settings" on public.system_settings;
create policy "Admins can view system settings"
on public.system_settings
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can manage system settings" on public.system_settings;
create policy "Admins can manage system settings"
on public.system_settings
for all
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

grant select, insert, update, delete on public.system_settings to authenticated;

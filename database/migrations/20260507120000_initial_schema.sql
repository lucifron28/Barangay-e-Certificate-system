-- Barangay Bato e-Certificate System initial schema
-- Apply this migration to the selected Supabase project after confirming the target project.

create extension if not exists pgcrypto;

create schema if not exists app_private;

create sequence if not exists public.request_number_seq;
create sequence if not exists public.clearance_control_number_seq;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  age integer null check (age is null or age > 0),
  address_sitio text null,
  date_of_birth date null,
  civil_status text null,
  contact_number text null,
  gender text null,
  occupation text null,
  email text not null,
  username text null unique,
  role text not null default 'resident' check (role in ('resident', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  certificate_type text not null check (
    certificate_type in (
      'barangay_clearance',
      'barangay_certificate',
      'barangay_indigency',
      'barangay_residency'
    )
  ),
  purpose text not null,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected', 'ready_for_pickup', 'done')
  ),
  remarks text null,
  submitted_data jsonb not null default '{}'::jsonb,
  control_number text null,
  date_requested timestamptz not null default now(),
  date_accepted timestamptz null,
  date_released timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pickup_schedules (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.certificate_requests(id) on delete cascade,
  pickup_date date not null,
  pickup_time time not null,
  remarks text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.certificate_requests(id) on delete cascade,
  certificate_type text not null,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  date_issued date not null,
  prepared_by uuid null references public.profiles(id) on delete set null,
  control_number text null,
  template_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null,
  role text not null,
  action text not null,
  affected_table text null,
  affected_record_id uuid null,
  remarks text null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null references public.certificate_requests(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  message text not null,
  status text not null,
  provider_response jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists certificate_requests_resident_id_idx on public.certificate_requests(resident_id);
create index if not exists certificate_requests_status_idx on public.certificate_requests(status);
create index if not exists certificate_requests_type_idx on public.certificate_requests(certificate_type);
create index if not exists certificate_requests_date_requested_idx on public.certificate_requests(date_requested);
create index if not exists pickup_schedules_request_id_idx on public.pickup_schedules(request_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where auth_user_id = (select auth.uid())
  limit 1;
$$;

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
  select coalesce(app_private.get_current_user_role() = 'admin', false);
$$;

create or replace function public.get_current_user_profile()
returns public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.profiles
  where auth_user_id = (select auth.uid())
  limit 1;
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
  select coalesce(public.get_current_user_role() = 'admin', false);
$$;

create or replace function app_private.generate_request_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'REQ-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.request_number_seq')::text, 4, '0');
$$;

create or replace function app_private.generate_clearance_control_number()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'BC-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.clearance_control_number_seq')::text, 4, '0');
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

  -- TODO: Final control number format needs client confirmation.
  if new.certificate_type = 'barangay_clearance'
    and (new.control_number is null or new.control_number = '') then
    new.control_number := app_private.generate_clearance_control_number();
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

create or replace function app_private.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or app_private.is_admin() then
    return new;
  end if;

  new.id := old.id;
  new.auth_user_id := old.auth_user_id;
  new.email := old.email;
  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

drop trigger if exists protect_profile_admin_fields on public.profiles;
create trigger protect_profile_admin_fields
before update on public.profiles
for each row execute function app_private.protect_profile_admin_fields();

drop trigger if exists prepare_certificate_request on public.certificate_requests;
create trigger prepare_certificate_request
before insert on public.certificate_requests
for each row execute function app_private.prepare_certificate_request();

drop trigger if exists set_certificate_requests_updated_at on public.certificate_requests;
create trigger set_certificate_requests_updated_at
before update on public.certificate_requests
for each row execute function app_private.set_updated_at();

drop trigger if exists set_pickup_schedules_updated_at on public.pickup_schedules;
create trigger set_pickup_schedules_updated_at
before update on public.pickup_schedules
for each row execute function app_private.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.certificate_requests enable row level security;
alter table public.pickup_schedules enable row level security;
alter table public.certificate_records enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "Profiles are viewable by owners or admins" on public.profiles;
create policy "Profiles are viewable by owners or admins"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (auth_user_id = (select auth.uid()) or app_private.is_admin())
);

drop policy if exists "Residents can create their own profile" on public.profiles;
create policy "Residents can create their own profile"
on public.profiles
for insert
to authenticated
with check (
  auth_user_id = (select auth.uid())
  and role = 'resident'
);

drop policy if exists "Profiles can be updated by owners or admins" on public.profiles;
create policy "Profiles can be updated by owners or admins"
on public.profiles
for update
to authenticated
using (
  auth_user_id = (select auth.uid()) or app_private.is_admin()
)
with check (
  auth_user_id = (select auth.uid()) or app_private.is_admin()
);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (app_private.is_admin());

drop policy if exists "Requests are viewable by owners or admins" on public.certificate_requests;
create policy "Requests are viewable by owners or admins"
on public.certificate_requests
for select
to authenticated
using (
  resident_id = app_private.current_profile_id()
  or app_private.is_admin()
);

drop policy if exists "Residents can create pending requests for themselves" on public.certificate_requests;
create policy "Residents can create pending requests for themselves"
on public.certificate_requests
for insert
to authenticated
with check (
  resident_id = app_private.current_profile_id()
  and status = 'pending'
);

drop policy if exists "Admins can update requests" on public.certificate_requests;
create policy "Admins can update requests"
on public.certificate_requests
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can delete requests" on public.certificate_requests;
create policy "Admins can delete requests"
on public.certificate_requests
for delete
to authenticated
using (app_private.is_admin());

drop policy if exists "Schedules are viewable by request owners or admins" on public.pickup_schedules;
create policy "Schedules are viewable by request owners or admins"
on public.pickup_schedules
for select
to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1
    from public.certificate_requests cr
    where cr.id = pickup_schedules.request_id
      and cr.resident_id = app_private.current_profile_id()
  )
);

drop policy if exists "Admins can insert schedules" on public.pickup_schedules;
create policy "Admins can insert schedules"
on public.pickup_schedules
for insert
to authenticated
with check (app_private.is_admin());

drop policy if exists "Admins can update schedules" on public.pickup_schedules;
create policy "Admins can update schedules"
on public.pickup_schedules
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can delete schedules" on public.pickup_schedules;
create policy "Admins can delete schedules"
on public.pickup_schedules
for delete
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can view certificate records" on public.certificate_records;
create policy "Admins can view certificate records"
on public.certificate_records
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can insert certificate records" on public.certificate_records;
create policy "Admins can insert certificate records"
on public.certificate_records
for insert
to authenticated
with check (app_private.is_admin());

drop policy if exists "Admins can update certificate records" on public.certificate_records;
create policy "Admins can update certificate records"
on public.certificate_records
for update
to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "Admins can view activity logs" on public.activity_logs;
create policy "Admins can view activity logs"
on public.activity_logs
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Authenticated users can insert their own activity logs" on public.activity_logs;
create policy "Authenticated users can insert their own activity logs"
on public.activity_logs
for insert
to authenticated
with check (
  user_id = app_private.current_profile_id()
  or app_private.is_admin()
);

drop policy if exists "Admins can view notification logs" on public.notification_logs;
create policy "Admins can view notification logs"
on public.notification_logs
for select
to authenticated
using (app_private.is_admin());

drop policy if exists "Admins can insert notification logs" on public.notification_logs;
create policy "Admins can insert notification logs"
on public.notification_logs
for insert
to authenticated
with check (app_private.is_admin());

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;
grant execute on function public.get_current_user_profile() to authenticated;
grant execute on function public.get_current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.certificate_requests to authenticated;
grant select, insert, update, delete on public.pickup_schedules to authenticated;
grant select, insert, update on public.certificate_records to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert on public.notification_logs to authenticated;
grant usage, select on sequence public.request_number_seq to authenticated;
grant usage, select on sequence public.clearance_control_number_seq to authenticated;

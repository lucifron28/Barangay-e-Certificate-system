-- Supabase schema parity for the local SQLite thesis workflow.
-- This migration prepares the deployment schema; the current online demo
-- actions remain SQLite-only until a confirmed Supabase project is connected.

create table if not exists public.document_counters (
  id uuid primary key default gen_random_uuid(),
  counter_type text not null check (counter_type in ('request_number', 'barangay_clearance_control_number', 'certificate_number')),
  year integer not null,
  current_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (counter_type, year)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.certificate_requests(id) on delete cascade,
  resident_id uuid not null references public.profiles(id),
  provider text not null,
  provider_transaction_id text not null unique,
  amount integer not null check (amount >= 0),
  currency text not null default 'PHP',
  status text not null check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'free')),
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_request_id_idx
  on public.payments (request_id, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.certificate_requests
  drop constraint if exists certificate_requests_payment_status_check;

alter table public.certificate_requests
  add constraint certificate_requests_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'free'));

alter table public.certificate_verifications
  add column if not exists updated_at timestamptz not null default now();

alter table public.certificate_records
  drop constraint if exists certificate_records_certificate_number_key;

create unique index if not exists certificate_records_certificate_number_unique
  on public.certificate_records (certificate_number)
  where certificate_number is not null;

alter table public.document_counters enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "No direct document counter access" on public.document_counters;
create policy "No direct document counter access"
on public.document_counters for all to authenticated
using (false) with check (false);

drop policy if exists "Residents view own payments" on public.payments;
create policy "Residents view own payments"
on public.payments for select to authenticated
using (resident_id = app_private.current_profile_id() or app_private.is_admin());

drop policy if exists "Residents create own accepted payments" on public.payments;
create policy "Residents create own accepted payments"
on public.payments for insert to authenticated
with check (
  resident_id = app_private.current_profile_id()
  and exists (
    select 1 from public.certificate_requests r
    where r.id = request_id
      and r.resident_id = app_private.current_profile_id()
      and r.status = 'accepted'
      and r.payment_status = 'unpaid'
  )
);

drop policy if exists "Residents view own payment events" on public.payment_events;
create policy "Residents view own payment events"
on public.payment_events for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = payment_id
      and (p.resident_id = app_private.current_profile_id() or app_private.is_admin())
  )
);

drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments"
on public.payments for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

drop policy if exists "Admins manage payment events" on public.payment_events;
create policy "Admins manage payment events"
on public.payment_events for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

drop policy if exists "Admins view certificate records" on public.certificate_records;
create policy "Admins view certificate records"
on public.certificate_records for select to authenticated
using (app_private.is_admin());

drop policy if exists "Admins insert certificate records" on public.certificate_records;
create policy "Admins insert certificate records"
on public.certificate_records for insert to authenticated
with check (app_private.is_admin());

drop policy if exists "Admins view system settings" on public.system_settings;
create policy "Admins view system settings"
on public.system_settings for select to authenticated
using (app_private.is_admin());

drop policy if exists "Main Admin manages system settings" on public.system_settings;
create policy "Main Admin manages system settings"
on public.system_settings for update to authenticated
using (app_private.get_current_user_role() = 'main_admin')
with check (app_private.get_current_user_role() = 'main_admin');

grant select, insert, update on public.payments to authenticated;
grant select on public.payment_events to authenticated;
grant select, insert on public.certificate_records to authenticated;
grant select, update on public.system_settings to authenticated;

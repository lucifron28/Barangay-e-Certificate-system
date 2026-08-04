-- Online certificate lifecycle fields. Apply after the existing schema migrations.

alter table public.certificate_requests
  add column if not exists fee_amount integer not null default 0,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists cancelled_at timestamptz;

alter table public.certificate_records
  add column if not exists pdf_path text,
  add column if not exists certificate_number text,
  add column if not exists status text not null default 'draft',
  add column if not exists issuance_mode text not null default 'fully_online_demo',
  add column if not exists issued_at timestamptz,
  add column if not exists issued_by uuid references public.profiles(id),
  add column if not exists certificate_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists pdf_sha256 text,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id),
  add column if not exists revocation_reason text,
  add column if not exists replacement_record_id uuid references public.certificate_records(id);

alter table public.certificate_requests
  drop constraint if exists certificate_requests_status_check;

alter table public.certificate_requests
  add constraint certificate_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'ready_for_pickup', 'ready_for_download', 'done', 'cancelled'));

alter table public.certificate_records
  drop constraint if exists certificate_records_request_id_key;

alter table public.certificate_records
  drop constraint if exists certificate_records_status_check;

alter table public.certificate_records
  add constraint certificate_records_status_check
  check (status in ('draft', 'issued', 'revoked', 'expired'));

create unique index if not exists certificate_records_certificate_number_unique
  on public.certificate_records (certificate_number)
  where certificate_number is not null;

create index if not exists certificate_records_request_id_idx
  on public.certificate_records (request_id, issued_at desc);

create table if not exists public.certificate_verifications (
  id uuid primary key default gen_random_uuid(),
  certificate_record_id uuid not null unique references public.certificate_records(id) on delete cascade,
  token_hash text not null unique,
  short_verification_code text not null unique,
  status text not null default 'valid' check (status in ('valid', 'expired', 'revoked')),
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_download_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_record_id uuid not null references public.certificate_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  result text not null,
  downloaded_at timestamptz not null default now()
);

alter table public.certificate_verifications enable row level security;
alter table public.certificate_download_logs enable row level security;

drop policy if exists "Public verification lookup is denied by default" on public.certificate_verifications;
create policy "Public verification lookup is denied by default"
on public.certificate_verifications for select to anon, authenticated using (false);

drop policy if exists "Admins manage verification records" on public.certificate_verifications;
create policy "Admins manage verification records"
on public.certificate_verifications for all to authenticated
using (app_private.is_admin()) with check (app_private.is_admin());

drop policy if exists "Residents view own certificate download logs" on public.certificate_download_logs;
create policy "Residents view own certificate download logs"
on public.certificate_download_logs for select to authenticated
using (user_id = app_private.current_profile_id() or app_private.is_admin());

drop policy if exists "Residents create own certificate download logs" on public.certificate_download_logs;
create policy "Residents create own certificate download logs"
on public.certificate_download_logs for insert to authenticated
with check (user_id = app_private.current_profile_id());

grant select, insert, update on public.certificate_verifications to authenticated;
grant select, insert on public.certificate_download_logs to authenticated;

-- TODO: production certificate PDF storage should use a private Supabase Storage bucket.

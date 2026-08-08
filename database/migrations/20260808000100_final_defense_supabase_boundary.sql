-- Final-defense Supabase boundary hardening.
-- SQLite remains the validated thesis/demo certificate lifecycle. Apply this
-- migration only to a reviewed Supabase project after inspecting its schema.

-- System settings are readable by both admin-side roles, but only the Main
-- Admin may change configuration values.
drop policy if exists "Admins can manage system settings" on public.system_settings;
drop policy if exists "Admins can view system settings" on public.system_settings;
drop policy if exists "Admins view system settings" on public.system_settings;
drop policy if exists "Main Admin manages system settings" on public.system_settings;
drop policy if exists "Admin-side users can view system settings" on public.system_settings;
drop policy if exists "Main Admin can insert system settings" on public.system_settings;
drop policy if exists "Main Admin can update system settings" on public.system_settings;
drop policy if exists "Main Admin can delete system settings" on public.system_settings;

create policy "Admin-side users can view system settings"
on public.system_settings
for select
to authenticated
using (app_private.is_admin());

create policy "Main Admin can insert system settings"
on public.system_settings
for insert
to authenticated
with check (app_private.get_current_user_role() = 'main_admin');

create policy "Main Admin can update system settings"
on public.system_settings
for update
to authenticated
using (app_private.get_current_user_role() = 'main_admin')
with check (app_private.get_current_user_role() = 'main_admin');

create policy "Main Admin can delete system settings"
on public.system_settings
for delete
to authenticated
using (app_private.get_current_user_role() = 'main_admin');

grant select, insert, update, delete on public.system_settings to authenticated;

-- Allocate a counter under a row lock so concurrent requests cannot receive
-- the same number. Counters are private and callable only by trigger-owned
-- functions; the Data API cannot invoke them directly.
create or replace function app_private.allocate_document_counter(
  counter_type text,
  requested_year integer default extract(year from clock_timestamp())::integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  allocated_value integer;
begin
  if counter_type not in ('request_number', 'barangay_clearance_control_number', 'certificate_number') then
    raise exception 'Unsupported document counter type';
  end if;

  if requested_year < 2000 or requested_year > 9999 then
    raise exception 'Document counter year is out of range';
  end if;

  insert into public.document_counters (
    counter_type,
    year,
    current_value,
    created_at,
    updated_at
  )
  values (
    counter_type,
    requested_year,
    1,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (counter_type, year)
  do update set
    current_value = public.document_counters.current_value + 1,
    updated_at = clock_timestamp()
  returning current_value into allocated_value;

  return allocated_value;
end;
$$;

create or replace function app_private.generate_request_number()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'REQ-' || extract(year from clock_timestamp())::integer::text || '-' ||
    lpad(app_private.allocate_document_counter('request_number')::text, 4, '0');
$$;

create or replace function app_private.generate_clearance_control_number()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'BCL-' || extract(year from clock_timestamp())::integer::text || '-' ||
    lpad(app_private.allocate_document_counter('barangay_clearance_control_number')::text, 4, '0');
$$;

create or replace function app_private.generate_certificate_number()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'CERT-' || extract(year from clock_timestamp())::integer::text || '-' ||
    lpad(app_private.allocate_document_counter('certificate_number')::text, 4, '0');
$$;

-- Re-state the trigger wrapper so future schema drift cannot restore the old
-- row-count allocation behavior.
create or replace function app_private.prepare_certificate_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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

revoke all on function app_private.allocate_document_counter(text, integer) from public, anon, authenticated;
revoke all on function app_private.generate_request_number() from public, anon, authenticated;
revoke all on function app_private.generate_clearance_control_number() from public, anon, authenticated;
revoke all on function app_private.generate_certificate_number() from public, anon, authenticated;
revoke all on function app_private.prepare_certificate_request() from public, anon, authenticated;

-- No resident-facing payment provider exists in the thesis/demo. Remove the
-- old policy that let residents insert paid payment rows with caller values;
-- admin policy access remains available for a future trusted service path.
drop policy if exists "Residents create own accepted payments" on public.payments;

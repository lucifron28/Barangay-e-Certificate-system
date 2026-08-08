-- Thesis deployment boundary for the prepared Supabase schema.
-- The local SQLite demo remains the authoritative end-to-end implementation.
-- Apply only after selecting and reviewing the intended Supabase project.

-- The admin UI must not edit resident profile information. Residents may edit
-- their own fields; service-role provisioning may still update protected fields.
create or replace function app_private.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce((select auth.jwt() ->> 'role'), '') = 'service_role' then
    return new;
  end if;

  new.id := old.id;
  new.auth_user_id := old.auth_user_id;
  new.email := old.email;
  new.role := old.role;
  return new;
end;
$$;

drop policy if exists "Profiles can be updated by owners or admins" on public.profiles;
drop policy if exists "Profiles are viewable by owners or admins" on public.profiles;
drop policy if exists "Residents can update their own profile" on public.profiles;

create policy "Profiles are viewable by owners or admins"
on public.profiles
for select
to authenticated
using (
  auth_user_id = (select auth.uid()) or app_private.is_admin()
);

create policy "Residents can update their own profile"
on public.profiles
for update
to authenticated
using (
  auth_user_id = (select auth.uid()) and role = 'resident'
)
with check (
  auth_user_id = (select auth.uid()) and role = 'resident'
);

-- Keep lifecycle tables protected in the exposed public schema. Public QR
-- verification is intentionally not exposed through the Data API in this
-- thesis boundary; the application currently serves it from SQLite only.
alter table public.certificate_verifications enable row level security;
alter table public.certificate_download_logs enable row level security;
alter table public.document_counters enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

-- Trigger-only and counter functions must not be callable as an authenticated
-- API surface. RLS helper functions remain executable for policy evaluation.
revoke execute on function app_private.generate_request_number() from anon, authenticated;
revoke execute on function app_private.generate_clearance_control_number() from anon, authenticated;
revoke execute on function app_private.prepare_certificate_request() from anon, authenticated;
revoke execute on function app_private.handle_new_auth_user() from anon, authenticated;
revoke execute on function app_private.protect_profile_admin_fields() from anon, authenticated;

-- New public-schema tables are not assumed to be Data API exposed. Keep
-- verification records private and grant only the authenticated admin paths
-- already covered by the RLS policies in the preceding lifecycle migrations.
revoke all on public.certificate_verifications from anon;
revoke all on public.certificate_download_logs from anon;
revoke all on public.document_counters from anon;
revoke all on public.payments from anon;
revoke all on public.payment_events from anon;

-- TODO: Create a private Supabase Storage bucket and server-side delivery path
-- for issued PDFs/signature assets after the deployment project is confirmed.

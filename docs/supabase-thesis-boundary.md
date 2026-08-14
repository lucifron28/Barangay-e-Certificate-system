# Supabase Legacy Boundary

This repository retains a prepared Supabase boundary for possible future use,
but the current client deployment target is Turso with Vercel Private Blob. No
live Supabase project or Supabase MCP connection was used for this deployment.

## Current boundary

- `DATABASE_PROVIDER=sqlite` is the supported local mode.
- SQLite owns local demo auth, request workflow, simulated payment, certificate PDF
  issuance, private PDF storage, QR verification, revocation, and reissue.
- `DATABASE_PROVIDER=supabase` uses the prepared SSR client, cookie session
  refresh, PostgreSQL migrations, and RLS policies where the repository has a
  Supabase query path.
- Supabase certificate lifecycle issuance and public QR verification are not
  claimed as live-validated. The public verification route returns a clear
  unavailable state instead of reading a local SQLite database in Supabase
  mode, and the admin certificate-save action fails closed instead of creating
  a partial `certificate_records` row.
- Certificate download pages also fail closed in Supabase mode instead of
  reading local certificate records. This prevents provider mixing.
- Supabase secret/service-role credentials remain server-only.

## Migration order

Apply these files to the confirmed project in filename order:

1. `database/migrations/20260507120000_initial_schema.sql`
2. `database/migrations/20260511090000_clarified_demo_supabase_schema.sql`
3. `database/migrations/20260805000100_online_certificate_lifecycle.sql`
4. `database/migrations/20260805000200_online_payment_and_counter_parity.sql`
5. `database/migrations/20260805000300_supabase_thesis_deployment_boundary.sql`
6. `database/migrations/20260808000100_final_defense_supabase_boundary.sql`

The Supabase CLI was not installed in the local environment, so the final
migration filename was created in the repository with the existing migration
timestamp convention. When the CLI is available, review it with the current
CLI's migration and advisor commands before applying it.

## Security decisions

- RLS remains enabled on every application table and lifecycle table.
- Residents can select their own profile/request data and update only their own
  resident profile fields.
- Main Admin and Barangay Secretary retain shared admin-side request access,
  while admin-side profile editing remains disabled by client decision.
- Public QR verification records are not exposed through the Data API in this
  boundary. A future server-side verifier must hash the supplied token and
  return only masked, non-sensitive issuance status.
- Trigger-only number generators and profile protection functions are not
  granted as authenticated API functions.
- System settings are readable by admin-side roles, but only `main_admin` can
  insert, update, or delete settings.
- Request, clearance-control, and certificate number allocation uses the
  private atomic `document_counters` allocator with a yearly key; the old
  row-count approach is not used by the final wrappers.
- Resident payment creation is not exposed until a trusted provider/service
  path is approved. The old resident payment-insert policy is removed by the
  final forward migration.
- No `service_role`/secret key is placed in a browser bundle.

## Required connection work later

1. Confirm the Supabase project and apply the migrations through the approved
   migration workflow.
2. Run Supabase security advisors and RLS tests against a real project.
3. Implement and test Supabase repositories for payment events, immutable
   certificate snapshots, private PDF delivery, and public verification. Keep
   the existing fail-closed certificate boundary until this work is complete.
4. Move official template/signature assets to a private Supabase Storage bucket
   only after privacy and retention rules are approved.
5. Re-run the full client acceptance workflow against Supabase before calling
   it a supported deployment mode.

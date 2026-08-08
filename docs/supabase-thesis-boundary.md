# Supabase Thesis Boundary

This repository has a prepared Supabase deployment boundary, but the thesis
demo is validated end to end with local SQLite. No live Supabase project or
Supabase MCP connection was available during this phase.

## Current boundary

- `DATABASE_PROVIDER=sqlite` is the supported local/demo mode.
- SQLite owns local demo auth, request workflow, mock payment, certificate PDF
  issuance, private PDF storage, QR verification, revocation, and reissue.
- `DATABASE_PROVIDER=supabase` uses the prepared SSR client, cookie session
  refresh, PostgreSQL migrations, and RLS policies where the repository has a
  Supabase query path.
- Supabase certificate lifecycle issuance and public QR verification are not
  claimed as live-validated. The public verification route returns a clear
  unavailable state instead of reading a local SQLite database in Supabase
  mode.
- Supabase secret/service-role credentials remain server-only.

## Migration order

Apply these files to the confirmed project in filename order:

1. `database/migrations/20260507120000_initial_schema.sql`
2. `database/migrations/20260511090000_clarified_demo_supabase_schema.sql`
3. `database/migrations/20260805000100_online_certificate_lifecycle.sql`
4. `database/migrations/20260805000200_online_payment_and_counter_parity.sql`
5. `database/migrations/20260805000300_supabase_thesis_deployment_boundary.sql`

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
- No `service_role`/secret key is placed in a browser bundle.

## Required connection work later

1. Confirm the Supabase project and apply the migrations through the approved
   migration workflow.
2. Run Supabase security advisors and RLS tests against a real project.
3. Implement and test Supabase repositories for payment events, immutable
   certificate snapshots, private PDF delivery, and public verification.
4. Move official template/signature assets to a private Supabase Storage bucket
   only after privacy and retention rules are approved.
5. Re-run the thesis workflow against Supabase before calling it a deployment
   mode.

# Supabase MCP Notes

A prior Supabase MCP inspection recorded the projects below on May 11, 2026.
No project was clearly identified as the Barangay Bato e-Certificate System,
so no live migrations were applied. The current repository remains safe to run
without Supabase credentials.

Detected projects:

- `Ours` (`vnjeyppwszafvxuzujuw`) - active, Postgres 17
- `PKM-DES` (`sdivxyqdnvnyjqrsrzdq`) - inactive, Postgres 17

When the correct Supabase project is ready:

1. Confirm the target project ID/ref with the project owner.
2. Apply `database/migrations/20260507120000_initial_schema.sql` if starting
   from the original MVP migration.
3. Apply `database/migrations/20260511090000_clarified_demo_supabase_schema.sql`
   for the clarified roles, statuses, fees, payment placeholder, settings table,
   yearly `BCL-YYYY-0001` control number generation, and updated RLS policies.
4. Run Supabase security and performance advisors.
5. Register Main Admin and Barangay Secretary accounts through the app.
6. Run `database/seed/001_admin_setup.sql` after replacing the placeholder
   emails.

For the current thesis workflow, also apply
`database/migrations/20260805000200_online_payment_and_counter_parity.sql` after
`20260805000100_online_certificate_lifecycle.sql`. It prepares
`document_counters`, `payments`, `payment_events`, certificate-number uniqueness,
verification timestamps, and the related RLS policies. The application
certificate/payment lifecycle has been validated against SQLite only; do not
describe this migration as live Supabase workflow validation.

Finally review
`database/migrations/20260805000300_supabase_thesis_deployment_boundary.sql`.
It keeps resident profile updates owner-only, removes trigger-only helpers from
the authenticated API surface, protects lifecycle tables, and documents that
public verification is not exposed through the Data API in the thesis boundary.

Storage is not required for local demo mode. Supabase Storage may be added later
for approved template assets, signature images, generated PDFs, or long-term
certificate archives.

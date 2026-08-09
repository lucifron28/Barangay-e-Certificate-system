# Barangay Bato e-Certificate System

Responsive web-based thesis/demo MVP for Barangay Bato, Mauban, Quezon. The
system lets residents register, request certificates, use simulated payment in
the fully-online demo path, download secure certificate PDFs, and verify QR
status. Main Admin and Barangay Secretary users can review, approve, reject,
issue, revoke, reissue, monitor records, export reports, and review activity
logs. A separate hybrid mode preserves the original office pickup workflow.

## Tech Stack

- Next.js App Router only
- React and TypeScript
- Tailwind CSS v4 with `@tailwindcss/postcss`
- daisyUI v5 using Tailwind v4 CSS plugin syntax
- SQLite local demo persistence with `better-sqlite3`
- Supabase-ready deployment mode with Supabase Auth, PostgreSQL, RLS, and
  `@supabase/ssr`
- Zod validation
- `pdf-lib` and `qrcode` for certificate PDF generation and QR verification
- `exceljs` for Excel report export
- Vitest for business-rule checks and GitHub Actions CI
- ESLint flat config and Prettier

## Version Notes

Official documentation and npm registry versions were checked on August 8, 2026
before this update. Sources used include the official Next.js installation docs,
Tailwind CSS PostCSS install docs, daisyUI install/theme docs, Supabase SSR/RLS
docs, SQLite docs, better-sqlite3, pdf-lib, and ExcelJS docs.

| Package                 | Version used |
| ----------------------- | ------------ |
| Next.js                 | `16.2.6`     |
| React                   | `19.2.6`     |
| React DOM               | `19.2.6`     |
| TypeScript              | `6.0.3`      |
| Tailwind CSS            | `4.3.0`      |
| `@tailwindcss/postcss`  | `4.3.0`      |
| daisyUI                 | `5.5.19`     |
| PostCSS                 | `8.5.25`     |
| `@supabase/supabase-js` | `2.105.4`    |
| `@supabase/ssr`         | `0.10.3`     |
| `better-sqlite3`        | `12.9.0`     |
| `exceljs`               | `4.4.0`      |
| `pdf-lib`               | `1.17.1`     |
| `qrcode`                | `1.5.4`      |
| `server-only`           | `0.0.1`      |
| `tsx`                   | `4.23.6`     |
| Vitest                  | `4.1.10`     |
| Zod                     | `4.4.3`      |
| ESLint                  | `10.3.0`     |
| Prettier                | `3.8.3`      |

Confirmed setup choices:

- Tailwind CSS v4 setup is used through `postcss.config.mjs`.
- Global CSS uses `@import "tailwindcss";`.
- daisyUI uses Tailwind v4 syntax: `@plugin "daisyui"`.
- Custom daisyUI theme `barangay-bato` is the default theme.
- Legacy Tailwind v3 imports and `npx tailwindcss init -p` are not used.
- App Router is used; Pages Router is not used.
- `@supabase/ssr` is used for Supabase deployment mode.
- SQLite is the default local database when Supabase keys are missing.
- No hardcoded API keys or real secrets are included.

## Existing Repo Status Before Latest Changes

At the beginning of this final-defense remediation pass, the existing repo
already contained the working Next.js App Router MVP, SQLite thesis/demo mode,
Supabase SSR utilities, Tailwind CSS v4, daisyUI, certificate issuance and
verification, reports, activity logs, and defense documentation.

This update preserved that structure and upgraded it incrementally. The final
pass focused on deterministic demo verification samples, one shared expiry
rule, issue-date preview binding, bounded PDF body layout, download outcome
auditing, storage isolation, hybrid state-transition enforcement, and a
fail-closed Supabase deployment boundary.

## Users And Roles

- `resident`: self-registers, logs in, submits requests, cancels pending
  requests, edits/resubmits rejected requests, views own requests, views own
  schedules, and updates own profile.
- `main_admin`: admin-side user with full demo management permissions.
- `barangay_secretary`: admin-side user with the same demo permissions as Main
  Admin for request review, scheduling, records, reports, and logs.

For this thesis/demo MVP, `main_admin` and `barangay_secretary` share the same
admin-side permissions, but both role values are stored separately.

## Confirmed Client Decisions Implemented

- Official system name is Barangay Bato e-Certificate System.
- Web-based only; responsive for phone browsers.
- Blue/white brand direction expanded into the accessible `barangay-bato`
  daisyUI theme.
- Residents can self-register without account approval.
- Main Admin and Barangay Secretary roles are supported.
- Admin-side users can view resident records but cannot edit resident profile
  information.
- Residents can edit their own profiles.
- Residents can cancel only pending requests.
- Accepted requests cannot be rejected later.
- Rejected requests can be edited and resubmitted; this MVP keeps the original
  request record and moves it back to `pending`.
- Barangay Clearance control numbers use `BCL-YYYY-0001`, reset by year, and
  preserve old years.
- Fees display as PHP 50 for Clearance, Certificate, and Residency; Indigency is
  free.
- `payment_status` placeholder is implemented with `unpaid`, `paid`, and `free`.
- Pickup scheduling is admin-assigned only and limited to Monday-Friday,
  8:00 AM-5:00 PM.
- Certificate pages include a visual signature/name placeholder only; this is
  not a legal digital signature system.

## Features Implemented

- Public Home, About, Login, and Register pages.
- Local SQLite demo auth with cookie-based sessions and hashed passwords.
- Supabase Auth/SSR utilities retained for deployment mode.
- Role-based redirects for resident and admin-side users.
- Resident dashboard, request form, request history, request detail, pickup
  schedule, and account profile editing.
- Admin dashboard, certificate request list/detail, resident records, pickup
  scheduling, reports, activity logs, account, and settings pages.
- Certificate request creation with confirmed fields:
  - Barangay Clearance: name, age, sitio, purpose
  - Barangay Certificate: name, age, place of birth, purpose
  - Barangay Indigency: name, age, sitio, purpose
  - Barangay Residency: name, age, birthdate, sitio, years of residency, purpose
- Request acceptance, rejection with required remarks, cancellation, resubmission,
  schedule assignment, ready-for-pickup, payment-paid marking, and done marking.
- Activity logging for login, request creation/update/cancellation, approval,
  rejection, status changes, schedule creation/update, payment paid, done, and
  certificate generation.
- Email notification templates for accepted, rejected, pickup scheduled, and
  ready-for-pickup events, with safe no-provider behavior.
- Printable HTML certificate templates and immutable private PDFs based on the
  provided official PDF references.
- Certificate numbers, SHA-256 PDF integrity checks, QR verification tokens,
  exactly 72-hour verification expiry from actual issuance, revocation, linked
  reissue, resident-only PDF downloads, and audited download denials.
- Long resident names, addresses, and maximum-length purposes are bounded by a
  server-side PDF layout guard and the request purpose limit.
- Hybrid ready-for-pickup transitions use the shared accepted-plus-schedule
  rule in the server action.
- Printable reports, report PDF download, and Excel export.
- Admin request details show payment attempts and notification delivery attempts.
- Supabase migration/RLS updates prepared, including payment, counter, and
  certificate verification parity tables.
- Main Admin-only signer display settings, audited by admin activity logs, with
  a consistent visual signature line in HTML and PDF.
- Vitest coverage for fee, request workflow, and pickup-office-hour rules.
- GitHub Actions CI for SQLite reset, lint, typecheck, tests, and production build.

## Features Partially Implemented

- Supabase deployment mode is prepared but not applied to a live project in this
  session because the available MCP projects were not clearly Barangay Bato.
- PDF and Excel report exports use a clean thesis/demo format while the final
  barangay monthly report format is pending.
- Residency, Clearance, and Indigency now use a shared historical-layout PDF
  renderer based on the provided PDFs; final production positioning still needs
  client print approval.
- Email notifications use optional Gmail SMTP through Nodemailer and safely skip
  when SMTP configuration is missing.
- Supabase production certificate issue, private delivery, and public
  verification remain a documented boundary and are not live-validated. The
  public verification route and certificate pages refuse to read SQLite when
  Supabase mode is set, and certificate saving fails closed rather than doing a
  partial record-only upsert.
- Browser-level and physical-phone QR rehearsal still require manual defense
  testing.

## Placeholders / Pending Client Confirmation

- Exact final certificate template positioning and print approval, including
  approved seal artwork.
- Final authorized-official display name and any approved signature asset. The
  current demo intentionally uses the same visual signature line in HTML/PDF.
- Whether payment recording should remain part of final production scope.
- Final barangay monthly report format.
- Gmail sender address, Google 2-Step Verification, and a Google App Password for
  authenticated SMTP.
- Production storage strategy for template assets, signature images, generated
  PDFs, or archives.
- Whether generated PDF records should persist file paths in Supabase Storage.
- Supabase payment-provider and certificate-issuer implementation after a real
  project, storage bucket, and operational policy are confirmed.

Every placeholder is marked with TODO comments in the code where it affects
implementation.

## Certificate Templates

Official Barangay Bato certificate template PDFs are treated as private visual
layout references and are intentionally ignored by Git:

- `docs/client-assets/certificate-templates/original/BRGY.CLEARANCE.pdf`
- `docs/client-assets/certificate-templates/original/BRGY.CERTIFICATE.PDF`
- `docs/client-assets/certificate-templates/original/RESIDENCY.pdf`
- `docs/client-assets/certificate-templates/original/INDIGENCY.pdf`

These files are not inside `app/`, are not publicly exposed, and are not assumed
to be fillable PDF forms. If any file contains real sample resident data, do not
use that data in seeds, screenshots, public demos, or tests. Current generation
uses a shared historical-layout PDF renderer for Residency, Clearance, and
Indigency, while the separate `PAGPAPATUNAY` path remains out of scope for this
alignment pass. Fresh fictional outputs were rendered and reviewed side by side
with the private originals. The renderer uses a clearly marked stylized
seal/watermark fallback because no approved seal assets exist in the repository.
Exact production positioning and final seal artwork still need client print
approval. See
[`docs/certificate-template-alignment.md`](docs/certificate-template-alignment.md)
for the anonymized gap analysis. Final production handling may move approved
template assets to Supabase Storage later.

## Defense Demo Reset

Run `npm run demo:reset` to recreate the SQLite database, seed synthetic
accounts and lifecycle states, generate real sample PDFs through the same
issuance service, and print fresh valid/expired/revoked verification URLs. The
generated PDFs are stored under `data/certificates/`, which is ignored by Git.
The reset seeds pending, accepted-unpaid, accepted-paid, free, valid, expired,
and revoked examples, payment attempts/events, download history, activity logs,
and skipped notification examples.

The defense sequence is documented in
[`docs/thesis-defense-runbook.md`](docs/thesis-defense-runbook.md), with the
equipment checklist in
[`docs/thesis-defense-checklist.md`](docs/thesis-defense-checklist.md). The
automated final gate is documented in
[`docs/final-defense-readiness.md`](docs/final-defense-readiness.md).

## Environment Variables

Copy `.env.example` to `.env.local`.

```env
DATABASE_PROVIDER=sqlite
SQLITE_DATABASE_URL=file:./data/dev.sqlite
# Thesis-defense default; use hybrid_physical_original only for office pickup demos.
CERTIFICATE_ISSUANCE_MODE=fully_online_demo

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<FILL_ME_GMAIL_ADDRESS>
SMTP_PASS=<FILL_ME_GMAIL_APP_PASSWORD>
EMAIL_FROM=Barangay Bato e-Certificate <FILL_ME_GMAIL_ADDRESS>
NEXT_PUBLIC_APP_URL=http://localhost:3000

LOCAL_DEMO_ADMIN_EMAIL=admin@example.com
LOCAL_DEMO_ADMIN_PASSWORD=password123
# Required in SQLite mode. Generate with: openssl rand -base64 32
LOCAL_DEMO_SECRET=
TRUST_PROXY=false
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are still
accepted for compatibility, but the preferred names are
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`.

Any `NEXT_PUBLIC_` variable is public and must not contain secrets.

## SQLite Local Demo Setup

SQLite is the default mode:

```bash
npm install
npm run db:sqlite:setup
npm run dev
```

The local database is stored at `data/dev.sqlite`, with SQLite sidecar files
ignored by Git. `LOCAL_DEMO_SECRET` is required in SQLite mode; local login and
registration remain unavailable until it is set to a unique value of at least
32 characters.

Useful database scripts:

```bash
npm run db:sqlite:setup
npm run db:sqlite:seed
npm run db:sqlite:reset
```

All three commands use the canonical `scripts/demo-reset.ts` seed path and
recreate the same synthetic seven-request lifecycle dataset. The legacy
`scripts/sqlite-setup.mjs` command remains as a compatibility wrapper. The
equivalent presentation command is `npm run demo:reset`; it also generates
certificate PDFs and prints verification samples. The test runner uses the
same reset path against `data/test.sqlite` and an isolated certificate folder.

## Demo Login Credentials

All seeded demo accounts use `password123` unless changed through environment
variables before seeding.

| Role               | Email                        | Username        |
| ------------------ | ---------------------------- | --------------- |
| Main Admin         | `admin@example.com`          | `mainadmin`     |
| Barangay Secretary | `secretary@example.com`      | `secretary`     |
| Resident           | `resident@example.com`       | `juanresident`  |
| Resident           | `maria.resident@example.com` | `mariaresident` |

Local demo auth is for thesis/local development only and must not be used as
production authentication.

`LOCAL_DEMO_SECRET` is required in SQLite mode and must be at least 32
characters. Generate it locally with `openssl rand -base64 32`, place it only
in `.env.local`, and restart the application. The system refuses local login
and registration until it is configured. `TRUST_PROXY` remains `false` for
local use; set it to `true` only behind a known reverse proxy that supplies a
trusted `x-forwarded-for` header.

## Database Mode Switching

Use `DATABASE_PROVIDER`:

- `sqlite`: local demo mode with SQLite and local cookie sessions.
- `supabase`: deployment mode with Supabase Auth, Supabase SSR cookies, and
  Supabase/PostgreSQL.

Business rules are centralized in `lib/services/` and provider-specific storage
is handled through `lib/db/sqlite/` and `lib/supabase/`.

## Database Schema Overview

SQLite and Supabase migrations model the same application concepts:

- `profiles`: residents and admin-side users, with local-only password hashes.
- `certificate_requests`: workflow status, submitted JSON data, fees, payment
  status, cancellation, and yearly request/control numbers.
- `pickup_schedules`: admin-assigned pickup date/time/remarks.
- `certificate_records`: immutable issuance snapshot, private PDF path/hash,
  certificate number, status, expiration, revocation, and replacement link.
- `certificate_verifications`: hashed QR tokens and public verification status.
- `certificate_download_logs`: resident certificate download audit entries.
- `activity_logs`: admin-only audit trail.
- `notification_logs`: email attempt records.
- `system_settings`: Barangay Captain display name, office hours, and future
  fee/theme settings.

The `payments`, `payment_events`, and `document_counters` tables are included
in the local schema and prepared Supabase migrations. Local SQLite is the only
mode with the complete issuance/payment/verification workflow validated.

Helper logic exists for request number generation, BCL control number generation,
fees, payment defaults, cancellation, scheduling, done rules, activity logging,
and role checks.

## Supabase Setup Instructions

1. Create or choose the correct Supabase project.
2. Set `DATABASE_PROVIDER=supabase`.
3. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   and `SUPABASE_SECRET_KEY`.
4. Apply `database/migrations/20260507120000_initial_schema.sql` if starting
   from the original MVP migration.
5. Apply `database/migrations/20260511090000_clarified_demo_supabase_schema.sql`.
6. Apply `database/migrations/20260805000100_online_certificate_lifecycle.sql`.
7. Apply `database/migrations/20260805000200_online_payment_and_counter_parity.sql`.
8. Apply `database/migrations/20260805000300_supabase_thesis_deployment_boundary.sql`.
9. Apply `database/migrations/20260808000100_final_defense_supabase_boundary.sql`.
10. Create the Main Admin and Barangay Secretary accounts, then promote them with
    the documented seed SQL.
11. Restart the app and verify role-based redirects and RLS behavior.

See [`docs/supabase-thesis-boundary.md`](docs/supabase-thesis-boundary.md) for
the exact SQLite-versus-Supabase thesis boundary and the remaining live-project
validation work.

## Supabase MCP Instructions

Supabase MCP was inspected on May 11, 2026. Available projects were `Ours`
(`vnjeyppwszafvxuzujuw`) and `PKM-DES` (`sdivxyqdnvnyjqrsrzdq`), but neither was
confirmed as the Barangay Bato project, so no live migrations were applied.

When the correct project is connected, confirm the project ref first, apply the
local migration files through MCP or the SQL editor, then run Supabase security
and performance advisors. The final boundary migration must be included. The
local SQLite lifecycle is tested; the Supabase workflow is schema preparation
and is not claimed as live-validated.
Additional notes are in `docs/supabase-mcp.md`.

## Supabase RLS Policy Overview

Prepared Supabase RLS policies cover:

- Residents view only their own profile and requests.
- Residents update only their own profile.
- Residents create only their own pending requests.
- Residents cancel only their own pending requests.
- Residents can resubmit only their own rejected requests back to pending.
- Residents cannot approve, reject, schedule, generate certificates, mark ready,
  mark paid, or mark done.
- Main Admin and Barangay Secretary can manage requests, schedules, records,
  reports, logs, notifications, and settings.
- Both admin-side roles can read `system_settings`, but only `main_admin` can
  insert, update, or delete settings.
- Resident payment-row creation is not exposed until a trusted provider path is
  implemented; the permissive legacy resident payment-insert policy is removed
  by the final forward migration.
- Admin-side users can view resident records but resident-profile editing is not
  enabled.
- Activity logs and certificate records are admin-side only. QR verification is
  served by a constrained public server route and exposes only masked resident
  identity and non-sensitive certificate metadata.

Security-definer helper functions live in `app_private`, not as application
authorization logic based on user metadata.

## Theme Switching

Themes are configured in `app/globals.css` with Tailwind v4/daisyUI syntax:

- `barangay-bato` (default custom theme)
- `light`
- `corporate`
- `winter`
- `business`
- `night`

The theme switcher stores the selected theme in `localStorage` and applies it to
`html[data-theme]`.

## Email Notification Setup

`sendEmailNotification()` uses Gmail SMTP through Nodemailer. Email is optional
for local development: if `SMTP_USER`, `SMTP_PASS`, or `EMAIL_FROM` is missing,
actions continue and notification logs record a skipped configuration result.

Gmail SMTP requires a Google App Password, not the normal Google account
password. For a thesis/demo sender:

1. Choose the Gmail account that will send thesis/demo notifications.
2. Enable Google 2-Step Verification for that account.
3. Create a Google App Password for this application.
4. Set `SMTP_USER` to the Gmail address.
5. Set `SMTP_PASS` to the generated App Password.
6. Set `EMAIL_FROM` to the desired display name and Gmail address.
7. Keep these server-only values out of source control and browser variables.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<YOUR_GMAIL_ADDRESS>
SMTP_PASS=<YOUR_GOOGLE_APP_PASSWORD>
EMAIL_FROM=Barangay Bato e-Certificate <YOUR_GMAIL_ADDRESS>
```

If Google revokes the App Password, generate a new one and update `SMTP_PASS`.
For a later Vercel deployment, copy the same values into server-side Vercel
Environment Variables. This is intended for low-volume thesis/demo email use,
not bulk email delivery.

Implemented email event templates:

- Certificate Request Accepted
- Certificate Request Rejected
- Pickup Schedule for Your Certificate Request
- Certificate Ready for Pickup

## PDF And Excel Export Notes

- Certificate previews are print-friendly HTML based on the provided PDF
  references.
- Final certificate PDFs are generated server-side with `pdf-lib` standard
  fonts, saved outside public assets, SHA-256 checked before release, and
  protected by resident ownership checks. The current PDF output is suitable
  for thesis/demo use; final production typography and print approval remain
  pending.
- QR tokens are random, stored only as hashes, and expire exactly 72 hours from
  the actual issuance timestamp. Expired and revoked certificates remain
  visible as status records but cannot be downloaded.
- Certificate download successes and denials are audited without storing raw QR
  tokens or private file paths.
- Reports can be printed, downloaded as PDF, and exported as Excel using
  `exceljs`.
- Final barangay monthly report formatting is still pending client confirmation.
- Browser print-to-PDF remains the fallback for printable HTML previews; the
  generated certificate PDF route is the tested downloadable artifact.

## Defense and Legal Notes

See [`docs/security-and-legal-limitations.md`](docs/security-and-legal-limitations.md)
for the thesis-only boundary: QR verification does not prevent copying, the
visual signature is not cryptographic, mock payment transfers no funds, and
production requires LGU, privacy, payment, and signature-policy approval.

## How To Run Locally

```bash
npm install
npm run db:sqlite:setup
npm run dev
```

Open `http://localhost:3000`.

Verification commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Current Progress Checklist

| Module                   | Status                                    | Notes                                                                                                               |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Existing Repo Inspection | Completed                                 | Existing files reviewed and preserved before changes                                                                |
| Public Pages             | Implemented                               | Home, Login, Register, About                                                                                        |
| Local SQLite Mode        | Implemented                               | Persistent local demo data in `data/dev.sqlite`                                                                     |
| Supabase Deployment Mode | Schema Prepared / Not Connected           | Uses `@supabase/ssr`; lifecycle is not live-validated                                                               |
| Resident Auth            | Implemented                               | SQLite demo auth; Supabase mode prepared                                                                            |
| Admin Auth               | Implemented                               | Main Admin and Barangay Secretary seeded locally                                                                    |
| Theme Switcher           | Implemented                               | Built-in daisyUI themes plus `barangay-bato`                                                                        |
| Certificate Requests     | Implemented                               | Uses confirmed client fields, fees, and payment status                                                              |
| Request Cancellation     | Implemented                               | Pending requests only                                                                                               |
| Rejected Resubmission    | Implemented                               | Same request record moves back to pending                                                                           |
| Certificate Generation   | Implemented / Print QA Pending            | Immutable HTML/PDF issue, bounded body layout, official-layout references, QR verification, revocation and reissue  |
| PDF Download             | Implemented / Audited                     | Resident-owned certificate/report routes; expiry, revocation, ownership, artifact, and integrity denials are logged |
| Pickup Scheduling        | Implemented                               | Admin-assigned; office hours enforced                                                                               |
| Fees                     | Implemented                               | PHP 50 or Free; online payment excluded                                                                             |
| Payment Status           | Implemented for Demo / Production Pending | Simulated payment attempts and history; no financial data is handled                                                |
| Admin Lifecycle Views    | Implemented                               | Payment attempts and notification delivery attempts are visible per request                                         |
| Email Notifications      | Implemented / Optional                    | Gmail SMTP through Nodemailer; skipped/sent/failed attempts are logged                                              |
| Reports                  | Implemented / Format Pending              | Print/PDF/Excel demo format implemented                                                                             |
| Activity Logs            | Implemented                               | Major lifecycle actions and downloads logged                                                                        |
| QR Verification          | Implemented                               | Hashed tokens, expiry, revoked status, masked public view                                                           |
| Revocation / Reissue     | Implemented                               | Revocation reason, audit trail, linked replacement certificate                                                      |
| Automated Checks         | Implemented                               | 53 Vitest tests plus GitHub Actions CI                                                                              |
| Supabase RLS             | Schema Prepared / Not Connected           | Forward boundary migration adds strict settings/payment policies and atomic counters                                |

The table deliberately distinguishes a completed SQLite thesis demo from
Supabase schema preparation. No claim is made that the full lifecycle is
production-ready on Supabase before a real project is connected and validated.

## Known Limitations

- Live Supabase schema was not changed because the correct project was not
  confirmed; the Supabase CLI was also not installed locally.
- Local demo auth is not production auth.
- Exact certificate positioning and standard-font typography still need final
  print QA against official templates.
- Signature handling is a consistent visual line/name placeholder and is not a
  legally verified digital signature.
- Payment behavior is simulated in the fully-online demo workflow; hybrid mode
  records office payment only. Neither path transfers real funds, and a real
  provider must be approved before production deployment.
- The final authorized official display name still requires client approval.
- Report exports use demo formatting until the official monthly report layout is
  provided.
- `npm install` reports moderate advisories from transitive packages; forced
  fixes were not applied because they may introduce breaking changes.

## Next Development Steps

1. Confirm the real Supabase project and apply migrations through MCP or SQL
   Editor, then run Supabase security/RLS advisors.
2. Implement and test the reviewed Supabase certificate issuer, private storage,
   and public verification service before enabling that provider.
3. Confirm the authorized official name and signature image.
4. Perform human print QA against the private provided certificate PDFs.
5. Replace simulated payment behavior with an approved production provider, or
   remove it before deployment.
6. Replace the demo report format with the official monthly barangay report
   format.
7. Rehearse the complete runbook, including a physical phone QR scan over LAN.

# Barangay Bato e-Certificate System

Responsive web-based thesis/demo MVP for Barangay Bato, Mauban, Quezon. The
system lets residents register, request certificates, track request status, and
view pickup schedules. Main Admin and Barangay Secretary users can review,
approve, reject, schedule, generate printable/downloadable certificates, monitor
records, export reports, and review activity logs.

## Tech Stack

- Next.js App Router only
- React and TypeScript
- Tailwind CSS v4 with `@tailwindcss/postcss`
- daisyUI v5 using Tailwind v4 CSS plugin syntax
- SQLite local demo persistence with `better-sqlite3`
- Supabase-ready deployment mode with Supabase Auth, PostgreSQL, RLS, and
  `@supabase/ssr`
- Zod validation
- `pdf-lib` for certificate/report PDF generation
- `exceljs` for Excel report export
- ESLint flat config and Prettier

## Version Notes

Official documentation and npm registry versions were checked on May 11, 2026
before this update. Sources used include the official Next.js installation docs,
Tailwind CSS PostCSS install docs, daisyUI install/theme docs, Supabase SSR/RLS
docs, SQLite docs, better-sqlite3, pdf-lib, and ExcelJS docs.

| Package | Version used |
| --- | --- |
| Next.js | `16.2.6` |
| React | `19.2.6` |
| React DOM | `19.2.6` |
| TypeScript | `6.0.3` |
| Tailwind CSS | `4.3.0` |
| `@tailwindcss/postcss` | `4.3.0` |
| daisyUI | `5.5.19` |
| `@supabase/supabase-js` | `2.105.4` |
| `@supabase/ssr` | `0.10.3` |
| `better-sqlite3` | `12.9.0` |
| `exceljs` | `4.4.0` |
| `pdf-lib` | `1.17.1` |
| Zod | `4.4.3` |
| ESLint | `10.3.0` |
| Prettier | `3.8.3` |

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

The existing repo already contained a working Next.js App Router MVP with public
pages, resident/admin layouts, Supabase SSR utilities, Tailwind CSS v4, daisyUI,
basic certificate requests, printable certificate previews, a protected
certificate PDF route, reports, activity logs, and README documentation.

This update preserved that structure and upgraded it rather than recreating the
project. Major gaps before this pass were: no SQLite local demo mode, old
`admin` role only, no `main_admin`/`barangay_secretary` split, no `cancelled`
status, no payment status placeholder, old `BC-YYYY-0001` clearance control
number wording, no custom Barangay Bato theme, limited client-clarified
certificate fields, and report Excel export not implemented.

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
- Placeholder email notifications for accepted, rejected, pickup scheduled, and
  ready-for-pickup events.
- Printable HTML certificate templates based on provided official PDF references.
- Protected certificate PDF download route.
- Printable reports, report PDF download, and Excel export.
- Supabase migration/RLS updates prepared.

## Features Partially Implemented

- Supabase deployment mode is prepared but not applied to a live project in this
  session because the available MCP projects were not clearly Barangay Bato.
- PDF and Excel report exports use a clean thesis/demo format while the final
  barangay monthly report format is pending.
- Certificate templates closely follow the provided PDFs as printable HTML/PDF
  placeholders; exact production positioning still needs final print approval.
- Email sending is wired for Resend-style API use but safely skips when keys are
  missing.
- Admin settings are displayed but not editable yet.

## Placeholders / Pending Client Confirmation

- Exact final certificate template positioning.
- Approved Barangay Captain name and electronic signature image asset.
- Whether payment recording should be part of final production scope.
- Final barangay monthly report format.
- Real email sender address and provider key.
- Production storage strategy for template assets, signature images, generated
  PDFs, or archives.
- Whether generated PDF records should persist file paths in Supabase Storage.

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
uses clean printable HTML templates and server-generated PDFs based on the
provided layouts. Final production handling may move approved template assets to
Supabase Storage later.

## Environment Variables

Copy `.env.example` to `.env.local`.

```env
DATABASE_PROVIDER=sqlite
SQLITE_DATABASE_URL=file:./data/dev.sqlite

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

RESEND_API_KEY=
EMAIL_FROM=
NEXT_PUBLIC_APP_URL=http://localhost:3000

LOCAL_DEMO_ADMIN_EMAIL=admin@example.com
LOCAL_DEMO_ADMIN_PASSWORD=password123
LOCAL_DEMO_SECRET=
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
ignored by Git. When `LOCAL_DEMO_SECRET` is blank, local demo auth creates a
random signing secret at `data/.local-demo-session-secret`; it is ignored by
Git so cookies remain valid across Next.js development workers without placing
a secret in source code.

Useful database scripts:

```bash
npm run db:sqlite:setup
npm run db:sqlite:seed
npm run db:sqlite:reset
```

`db:sqlite:reset` recreates the local demo database and sample data.

## Demo Login Credentials

All seeded demo accounts use `password123` unless changed through environment
variables before seeding.

| Role | Email | Username |
| --- | --- | --- |
| Main Admin | `admin@example.com` | `mainadmin` |
| Barangay Secretary | `secretary@example.com` | `secretary` |
| Resident | `resident@example.com` | `juanresident` |
| Resident | `maria.resident@example.com` | `mariaresident` |

Local demo auth is for thesis/local development only and must not be used as
production authentication.

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
- `certificate_records`: generated certificate metadata and optional `pdf_path`.
- `activity_logs`: admin-only audit trail.
- `notification_logs`: email attempt records.
- `system_settings`: Barangay Captain name, signature path, office hours, and
  future fee/theme settings.

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
6. Register the Main Admin and Barangay Secretary accounts through `/register`.
7. Update and run `database/seed/001_admin_setup.sql` to promote accounts.
8. Restart the app and verify role-based redirects.

## Supabase MCP Instructions

Supabase MCP was inspected on May 11, 2026. Available projects were `Ours`
(`vnjeyppwszafvxuzujuw`) and `PKM-DES` (`sdivxyqdnvnyjqrsrzdq`), but neither was
confirmed as the Barangay Bato project, so no live migrations were applied.

When the correct project is connected, confirm the project ref first, apply the
local migration files, then run Supabase security and performance advisors.
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
- Admin-side users can view resident records but resident-profile editing is not
  enabled.
- Activity logs and certificate records are admin-side only.

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

`sendEmailNotification()` supports future real provider integration. If
`RESEND_API_KEY` or `EMAIL_FROM` is missing, actions continue and notification
logs record a skipped placeholder result.

Implemented email event templates:

- Certificate Request Accepted
- Certificate Request Rejected
- Pickup Schedule for Your Certificate Request
- Certificate Ready for Pickup

## PDF And Excel Export Notes

- Certificate previews are print-friendly HTML.
- Certificate PDF downloads are generated server-side with `pdf-lib`.
- Reports can be printed, downloaded as PDF, and exported as Excel using
  `exceljs`.
- Final barangay monthly report formatting is still pending client confirmation.

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
npm run build
```

## Current Progress Checklist

| Module | Status | Notes |
| --- | --- | --- |
| Existing Repo Inspection | Completed | Existing files reviewed and preserved before changes |
| Public Pages | Implemented | Home, Login, Register, About |
| Local SQLite Mode | Implemented | Persistent local demo data in `data/dev.sqlite` |
| Supabase Deployment Mode | Prepared / Partial | Uses `@supabase/ssr`; live project not migrated yet |
| Resident Auth | Implemented | SQLite demo auth; Supabase mode prepared |
| Admin Auth | Implemented | Main Admin and Barangay Secretary seeded locally |
| Theme Switcher | Implemented | Built-in daisyUI themes plus `barangay-bato` |
| Certificate Requests | Implemented | Uses confirmed client fields, fees, and payment status |
| Request Cancellation | Implemented | Pending requests only |
| Rejected Resubmission | Implemented | Same request record moves back to pending |
| Certificate Generation | Partial | Printable HTML/PDF based on official templates |
| PDF Download | Implemented | Certificate and report PDF routes |
| Pickup Scheduling | Implemented | Admin-assigned; office hours enforced |
| Fees | Implemented | PHP 50 or Free; online payment excluded |
| Payment Status | Placeholder / Partial | Implemented but still needs final client confirmation |
| Email Notifications | Placeholder / Partial | Templates implemented; real sending pending keys |
| Reports | Partial | Print/PDF/Excel demo format implemented |
| Activity Logs | Implemented / Partial | Major actions logged; coverage can expand with tests |
| Supabase RLS | Prepared / Partial | Migration generated; live apply pending correct project |

## Known Limitations

- Live Supabase schema was not changed because the correct project was not
  confirmed.
- Local demo auth is not production auth.
- Exact certificate positioning still needs final print QA against official
  templates.
- Signature image support is visual-only and not legally verified.
- Payment status is a placeholder pending final client confirmation.
- Admin settings are display-only in this MVP update.
- Report exports use demo formatting until the official monthly report layout is
  provided.
- `npm install` reports moderate advisories from transitive packages; forced
  fixes were not applied because they may introduce breaking changes.

## Next Development Steps

1. Confirm the real Supabase project and apply migrations through MCP or SQL
   Editor.
2. Confirm Barangay Captain name and approved signature image handling.
3. Perform print QA against the provided certificate PDFs.
4. Confirm payment recording scope.
5. Replace demo report format with the official monthly barangay report format.
6. Add automated tests around auth guards, request state transitions, and report
   exports.

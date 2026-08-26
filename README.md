# Barangay Bato e-Certificate System

Responsive web application for Barangay Bato, Mauban, Quezon. Residents can
submit certificate requests and track status. Main Admin and Barangay
Secretary users can review requests, verify GCash and Maya payment proofs,
issue private certificates, review reports, and inspect activity history.

This repository is prepared for client preview and deployment handoff. It does
not connect an automated payment gateway. Residents pay using their external
GCash or Maya apps, submit transaction proof, and authorized barangay staff
manually verify each transaction before certificate issuance.
## Current Deployment Target

| Environment | Database | Certificate storage | Email |
| --- | --- | --- | --- |
| Local development and CI | SQLite | Local ignored directory | Optional placeholder/logging |
| Vercel preview/production | Turso | Vercel Private Blob | Gmail SMTP via App Password |

Supabase utilities and migrations remain available as a separate deployment
option. The active client QA deployment uses Turso, Vercel Private Blob,
and provider-neutral application services.
## Tech Stack And Versions

- Next.js 16.3.0 App Router with React 19.2.8
- TypeScript 6.0.3 (latest version supported by the current TypeScript ESLint
  release; TypeScript 7.0.2 currently has an incompatible peer range)
- Tailwind CSS 4.3.3 and daisyUI 5.7.16
- SQLite with `better-sqlite3` 13.0.3 for local development and CI
- Turso with `@tursodatabase/serverless` 1.4.0 for remote deployment
- Vercel Private Blob with `@vercel/blob` 2.8.0 for private PDFs
- Supabase SSR utilities: `@supabase/ssr` 0.12.4 and
  `@supabase/supabase-js` 2.112.3, retained for legacy/future compatibility
- Nodemailer 9.0.5, `pdf-lib` 1.17.1, `write-excel-file` 4.1.1, Zod 4.4.3
- Vitest 4.1.10, ESLint 10.8.1, Prettier 3.9.6

Tailwind v4 is configured with `@tailwindcss/postcss` and
`@import "tailwindcss"`. The project does not use legacy Tailwind v3 imports,
`tailwind.config.js` content arrays, or `npx tailwindcss init -p`.

daisyUI uses the Tailwind v4 plugin syntax in `app/globals.css`:

```css
@import "tailwindcss";
@plugin "daisyui";
```

The App Router is used. The Pages Router, `pages/`, `pages/api/`, `_app.tsx`,
and `_document.tsx` are not used. Supabase utilities use `@supabase/ssr`; old
Supabase auth helper packages are not used.

## Existing Repository Status Before This Work

The repository already contained the App Router MVP, four certificate layout
implementations, SQLite demo data, role routing, private local certificate
files, QR verification, PDF integrity checks, revocation/reissue, reports,
and the SMTP test-isolation remediation. This work preserves those features
and adds the Turso/Private Blob production boundary, persistent sessions,
versioned migrations, and client handoff documentation.

## Users And Roles

- `resident`: creates an account, submits requests, edits their own profile,
  cancels pending requests, resubmits rejected requests, and views their own
  certificates.
- `main_admin`: full admin-side workflow access and system settings access.
- `barangay_secretary`: admin-side request, certificate, report, and
  activity-log access. System settings remain view-only.

Main Admin and Barangay Secretary share the initial operational permissions,
but their role values remain separate for future permission refinement.

## Confirmed Client Decisions

- Web-based system, usable from a phone browser.
- Four certificate types: Clearance, Certificate/Pagpapatunay, Indigency, and
  Residency.
- Fees: PHP 50 for Clearance, Certificate, and Residency; Indigency is free.
- Payment state is `unpaid`, `paid`, or `free`. Payment is completed via manual
  GCash or Maya verification where residents pay externally and submit proof
  for staff review. No automated payment gateway or webhook integration is used.
  rejected or cancelled by residents.
- Rejected requests can be resubmitted using the existing request record.
- Electronic signature output is a visual placeholder, not a legally verified
  digital signature.
- Certificate downloads are private, authenticated, integrity-checked, and
  logged.

## Features Implemented

- Public Home, About, Login, Register, and Certificate Verification pages.
- Public QR camera scanner, image QR decoder, and manual short-code verification at `/verify`.
- Responsive resident/admin layouts with theme switching.
- SQLite authentication with scrypt password hashes and opaque, server-side,
  revocable sessions.
- Role-based redirects and access checks for protected routes.
- Resident profile editing and request forms with saved profile data.
- All four confirmed certificate request field sets.
- `REQ-YYYY-0001` request numbers and `BCL-YYYY-0001` Clearance controls.
- Year-scoped atomic counters for requests, controls, and certificates.
- Acceptance, rejection with required remarks, cancellation, and rejected
  request resubmission.
- Manual GCash and Maya payment proof submission and staff verification queue
  with private proof image storage and duplicate-reference protection.
- An explicit thesis demo payment mode can expose clearly marked, generated
  non-payment QR codes for GCash and Maya when `PAYMENT_DEMO_MODE=true`. The
  demo flow still requires proof submission and staff verification.
- Printable certificate HTML and generated PDF layouts based on supplied
  official reference PDFs.
- Private local PDF storage and a Vercel Private Blob adapter.
- Protected resident/admin PDF routes with SHA-256 checks, safe headers,
  revocation/expiry checks, and download audit logs.
- Immutable certificate snapshots, exact 72-hour verification expiry, QR
  verification, revocation, and reissue.
- Admin reports, printable PDF reports, Excel export, activity logs, and
  notification-attempt logs.
- Gmail SMTP notifications that safely skip when not configured.
- Provider-neutral asynchronous database boundary for SQLite and Turso.
- Forward-only migrations and guarded migration/reset scripts.

## Placeholders / Pending Client Confirmation

- Turso and Vercel Private Blob are connected to the live Vercel deployment;
  backup/restore and operational monitoring still need a client-approved
  runbook.
- Gmail delivery requires a client-owned App Password and approved test
  recipient.
- The monthly barangay report remains a clean preview format until its final
  form is supplied.
- The default Vercel HTTPS domain is live; a custom domain, Captain identity,
  signature/seal assets, retention policy, and print approval remain client
  handoff items.
- Synthetic Main Admin, Barangay Secretary, and resident identities are seeded
  in the current Turso presentation database. Public registration still cannot
  create admin roles, and real operator identities must replace the demo users
  before operational use.
- A real online payment gateway, provider credentials, refunds, and financial
  reconciliation remain outside this presentation scope.
- Blob orphan cleanup is best-effort on issuance failure; a scheduled
  reconciliation job can be added after production storage is approved.

## Architecture

Application code calls `lib/db/queries.ts`, the provider-neutral async
repository. Provider implementations are isolated under `lib/db/sqlite/` and
`lib/db/turso/`. SQLite may remain synchronous internally, but the application
boundary returns Promises. When `DATABASE_PROVIDER=turso`, missing credentials
throw an error and the application never silently falls back to SQLite.

Certificate files use `lib/certificates/private-storage.ts`. Local mode writes
to an ignored directory. Turso mode requires
`CERTIFICATE_STORAGE_PROVIDER=vercel_blob` and a private Blob token. The
database stores provider, object key, and SHA-256 metadata; PDF bytes are not
stored in Turso.

## Current Deployment

The presentation deployment is live on Vercel:

- Production: <https://barangay-bato-ecertificate-system.vercel.app>
- Latest production deployment: <https://barangay-bato-ecertificate-system-dn29p39ef-ron-cada-projects.vercel.app>
- Vercel project: `barangay-bato-ecertificate-system`
- Database: Turso migrations `0000_initial_schema.sql`,
  `0001_client_deployment.sql`, and `0002_full_online_workflow.sql` are
  applied with no pending migrations.
- Certificate storage: private Vercel Blob is connected for Production,
  Preview, and Development.

The deployment is suitable for controlled presentation testing. Email delivery
is intentionally disabled until approved SMTP credentials are added. The
current production database contains only synthetic presentation records; do
not use these accounts as operational credentials.

### Production QA Accounts And Canonical Samples

The current Vercel deployment is seeded with synthetic accounts and canonical sample requests for all four supported certificate types:

1. Barangay Clearance (`REQ-YYYY-9002`)
2. Barangay Certificate / PAGPAPATUNAY (`REQ-YYYY-9004`)
3. Barangay Indigency (`REQ-YYYY-9001`)
4. Barangay Residency (`REQ-YYYY-9003`)

Passwords are intentionally not stored in this repository or documentation.

| Role | Email | Username |
| --- | --- | --- |
| Main Admin | `admin@example.com` | `mainadmin` |
| Barangay Secretary | `secretary@example.com` | `secretary` |
| Resident | `resident@example.com` | `juanresident` |
| Resident | `maria.resident@example.com` | `mariaresident` |

These accounts and the four canonical sample requests are synthetic client QA data
only.

### Safe Requests-Only Sample Maintenance

To maintain or update canonical QA request fixtures without rotating account passwords or revoking existing active sessions:

```bash
DATABASE_PROVIDER=turso npm run db:seed:turso-qa-requests -- --confirm-client-qa
```

The requests-only seed command:
- requires `DATABASE_PROVIDER=turso`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN`
- requires explicit confirmation (`--confirm-client-qa`)
- verifies known synthetic resident IDs exist in the database
- inserts canonical QA request fixtures idempotently
- NEVER updates profiles or password hashes
- NEVER revokes `auth_sessions`
- NEVER deletes existing records or resets the database
- does NOT require `DEMO_ADMIN_PASSWORD` or `DEMO_RESIDENT_PASSWORD`

### Full Account Bootstrap Seed

To seed or reset accounts on a fresh database only:

```bash
DATABASE_PROVIDER=turso npm run db:seed:turso-demo -- --confirm-client-qa
```

The full account seed requires privately supplied `DEMO_ADMIN_PASSWORD` and `DEMO_RESIDENT_PASSWORD` (each at least 14 characters) and revokes existing sessions for the seeded profiles before updating password hashes.
## Environment Variables

Copy `.env.example` to `.env.local`. Use placeholders until client resources
are approved. Never commit `.env`, `.env.local`, `.env.agent`, credentials, or
generated private PDFs.

Local minimum:

```env
DATABASE_PROVIDER=sqlite
SQLITE_DATABASE_URL=file:./data/dev.sqlite
CERTIFICATE_STORAGE_PROVIDER=local
SESSION_COOKIE_SECRET=replace-with-at-least-32-random-characters
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`LOCAL_DEMO_SECRET` may be used instead of `SESSION_COOKIE_SECRET` locally.
Production must use `SESSION_COOKIE_SECRET`.

Production minimum:

```env
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=<database-scoped-url>
TURSO_AUTH_TOKEN=<database-scoped-token>
CERTIFICATE_STORAGE_PROVIDER=vercel_blob
BLOB_READ_WRITE_TOKEN=<private-blob-token>
SESSION_COOKIE_SECRET=<at-least-32-random-characters>
NEXT_PUBLIC_APP_URL=https://<approved-domain>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<approved-gmail-address>
SMTP_PASS=<gmail-app-password>
EMAIL_FROM=Barangay Bato e-Certificate <approved-gmail-address>
```

Run `npm run check:production-env` to validate production requirements without
printing secret values. It should fail until real approved values are set.

## SQLite Local Setup

```bash
npm ci
npm run db:sqlite:reset
npm run dev
```

The reset command is SQLite-only and refuses to load for Turso. It requires
`LOCAL_DEMO_ADMIN_PASSWORD` to be set in the local shell and never uses a
default password. It creates synthetic data in `data/dev.sqlite`; it never
imports that file into Turso.
Tests use separate `data/test.sqlite` and `data/certificates-test/` paths.

Useful commands:

```bash
npm run db:status
npm run lint
npm run typecheck
npm test
npm run build
```

### Local Demo Accounts

| Role | Email | Username |
| --- | --- | --- |
| Main Admin | `admin@example.com` | `mainadmin` |
| Barangay Secretary | `secretary@example.com` | `secretary` |
| Resident | `resident@example.com` | `juanresident` |
| Resident | `maria.resident@example.com` | `mariaresident` |

These accounts and records are synthetic and local-preview only. Keep the
password value in a local secret manager or shell, not in source control.

## Turso Setup

Turso is the production database target. The selected SDK is
`@tursodatabase/serverless`, the current direct asynchronous TypeScript SDK
for serverless runtimes. `@libsql/client` was not added because no ORM or
compatibility requirement calls for it.

Use the current Turso CLI flow with a database-scoped token:

```bash
turso auth login
turso db create barangay-bato-ecert
turso db show barangay-bato-ecert --url
turso db tokens create barangay-bato-ecert
```

Store the returned URL and token only in the selected Vercel environment or a
secret manager. Do not commit or print the token. Apply the remote schema with:

```bash
DATABASE_PROVIDER=turso npm run db:migrate:turso
DATABASE_PROVIDER=turso npm run db:status
```

PowerShell users should set variables with `$env:` or Vercel environment
configuration rather than committing secrets to shell history.

## Database Schema And Migrations

`database/migrations/0000_initial_schema.sql` is the canonical SQLite/Turso
business schema. `0001_client_deployment.sql` adds persistent sessions,
issuance reservations, and storage metadata. `0002_full_online_workflow.sql`
promotes any legacy ready-for-pickup rows to the secure-download state without
deleting audit history. The schema covers profiles, legacy schedule records,
certificate records, payments, payment events,
verification records, download logs, notifications, activity logs, settings,
counters, and persistent rate-limit attempts.

Migrations are ordered, forward-only, and tracked in `schema_migrations`.
SQLite startup applies them additively; Turso uses the same SQL files through
`db:migrate:turso`. No migration drops production data.

`npm run demo:reset` and `npm run db:sqlite:reset` are local-only. There is no
normal remote reset command and no workflow that uploads `data/dev.sqlite` to
Turso.

## Vercel Private Blob Setup

Production PDFs use `@vercel/blob` with `access: "private"`. The browser never
receives a Blob URL or Blob credential. Authenticated application routes load
private objects server-side, verify SHA-256 against the database record, write
an audit record, and stream with `no-store` and `nosniff` headers.

If upload or database finalization fails, issuance performs best-effort object
cleanup and releases the retryable reservation. Existing finalized objects are
never removed by failure cleanup.

## Certificate Templates

Official reference files are expected at
`docs/client-assets/certificate-templates/original/`:

- `BRGY.CLEARANCE.pdf`
- `BRGY.CERTIFICATE.PDF`
- `RESIDENCY.pdf`
- `INDIGENCY.pdf`

These files are private layout references, ignored by Git, not assumed to be
fillable, and never served from `app/`. The current generator uses printable
HTML/PDF layouts based on the supplied references with synthetic seed data.
Exact positioning and final official asset replacement remain approval items.
Production handling may move approved reference/signature assets to Supabase
Storage later if the client changes the deployment target; the current target
for generated PDFs is Vercel Private Blob.

## Authentication And Security

SQLite and Turso use the provider-neutral authentication service. Passwords
use scrypt hashes. The browser stores only a random opaque HttpOnly token;
the database stores its SHA-256 hash, expiry, last-seen value, and revocation
state. Role checks load current profile data. Login rate-limit attempts persist
in the active database. Production cookies are secure when the configured app
URL uses HTTPS.

Supabase Auth/SSR and RLS files are retained as legacy/future preparation, but
client deployment documentation does not instruct operators to configure
Supabase.

## Email Notifications

`sendEmailNotification()` uses Nodemailer and Gmail SMTP when configured. It
does not block the main workflow when credentials are missing; attempts are
logged as skipped or failed without exposing secrets. The test runner blanks
`SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`, so parent-shell or local-env SMTP
values cannot leak into tests.

Gmail requires two-step verification and an App Password for the approved
sender. Do not use the normal Gmail account password. Test with an approved
synthetic recipient before enabling client notifications.

## Reports And Payments

Reports support filtering, browser print, PDF download, and Excel export through
`write-excel-file` 4.1.1. The monthly barangay format remains pending final
client confirmation.

Payment records support manual GCash and Maya transaction verification. No
automated payment gateway, card processing, or bank funds transfer API is used.
Residents scan the official barangay QR code, pay in their external app, and
submit their reference number and receipt screenshot. Authorized barangay staff
cross-check merchant records and confirm payment before issuing certificates.

For a thesis presentation without real merchant details, set
`PAYMENT_DEMO_MODE=true`. The resident page then shows selectable GCash and Maya
demo methods with generated QR images that do not receive money. Use test
references and clearly marked test screenshots. Staff must still approve the
submitted proof before the request becomes paid. Keep this setting `false` when
using real accounts.
## Supabase MCP Status

No Supabase MCP changes were applied for this deployment goal. Supabase files
are retained as legacy/future preparation. If the client later changes the
deployment target, inspect the connected project first and apply reviewed SQL
through MCP only after explicit confirmation.

## Client Handoff Documentation

- [Client readiness overview](docs/client-readiness.md)
- [Vercel and Turso deployment guide](docs/deployment-vercel-turso.md)
- [Client acceptance checklist](docs/client-acceptance-checklist.md)
- [Client acceptance runbook](docs/client-acceptance-runbook.md)
- [Certificate QR scanner test gallery](docs/scanner-test-samples.md)
- [Operations guide](docs/operations.md)
- [Certificate template alignment notes](docs/certificate-template-alignment.md)

The old `docs/def/` directory is retained as archived historical material and
is not an active operating or deployment guide.

## Current Progress

| Module | Status | Notes |
| --- | --- | --- |
| Existing repo inspection | Completed | Existing MVP and merged work preserved |
| Public pages | Implemented | Home, About, Login, Register |
| Local SQLite mode | Implemented | Persistent local database and synthetic seed |
| Turso deployment mode | Deployed / Partial | Async provider, migrations applied, fail-closed credentials |
| Vercel deployment | Deployed / Partial | Production alias is live; synthetic presentation accounts seeded; email remains |
| Private certificate storage | Deployed / Partial | Local plus private Vercel Blob adapters |
| Resident authentication | Implemented | Hashed passwords and revocable sessions |
| Admin authentication | Implemented | Main Admin and Barangay Secretary roles |
| Certificate requests | Implemented | Four confirmed certificate field sets |
| Request cancellation/resubmission | Implemented | Pending cancellation and rejected resubmission |
| Certificate generation | Implemented / Partial | Four printable layouts based on supplied PDFs |
| PDF download | Implemented | Private retrieval, hash check, and audit log |
| Online delivery | Implemented | Accepted requests proceed through manual payment proof verification and secure PDF download |
| Fees | Implemented | PHP 50 or free; manual GCash/Maya verification |
| Payment status | Implemented | `unpaid`, `paid`, and `free`; verified by staff |
| Thesis demo payments | Implemented / Optional | Opt-in non-payment GCash/Maya QR mode |
| Email notifications | Prepared / Optional | Gmail SMTP pending approved credentials |
| Reports | Implemented / Partial | Print, PDF, Excel; monthly format pending |
| Activity logs | Implemented | Admin-only major action history |
| Supabase RLS | Legacy prepared | Not the current deployment target |
| Client handoff docs | Implemented | Readiness, deployment, operations, acceptance |

## Known Limitations And Next Steps

- Email notifications are not active because SMTP credentials were not
  supplied; the application skips notification delivery without failing the
  main action.
- Production contains synthetic presentation identities only; real operator
  credentials and a controlled account replacement remain pending.
- Approved Captain identity, signature/seal assets, print approval, report
  format, retention policy, and payment policy still require client input.
- The visual signature is not cryptographically or legally verified.
- Demo payment mode uses non-payment QR codes and must not be used to collect
  real funds.
- A scheduled Blob orphan reconciliation job can be added after the production
  storage account is approved.

Next: replace the synthetic identities through a controlled process, configure
and test the approved SMTP sender, run the client acceptance checklist with
synthetic records, and obtain print, email, report, and certificate-template
approval before treating the deployment as operational.

## Data Notice

This is a private client project. Do not publish resident records,
private certificate PDFs, credentials, or client reference assets.

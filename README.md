# Barangay Bato e-Certificate System

A web-based certificate request and issuance system for **Barangay Bato, Mauban, Quezon**. Residents can apply for barangay certificates online, track requests, submit proof of external GCash/Maya payments when a fee is required, and securely download issued certificates. Authorized barangay personnel review requests, manually verify payments, sign/issue certificates, and manage reports and audit history.

**Live application (client/presentation environment):** https://barangay-bato-ecertificate-system.vercel.app

> **For the client group / thesis readers:** Start with [How the system was developed](#how-the-system-was-developed-step-by-step), [Project structure](#project-structure-where-to-find-the-code), and [End-to-end workflow](#end-to-end-workflow). These sections explain *paano nabuo ang system*, how its parts are organized, and how they work together.
>
> **Documentation accuracy:** This is a reconstruction based on the current source code, Git commits, and existing project documents. It describes the implementation phases and traceable technical decisions—not an original day-by-day developer diary, sprint calendar, or claim that every feature was written from scratch in the order listed.

## Contents

1. [System purpose and scope](#system-purpose-and-scope)
2. [How the system was developed (step by step)](#how-the-system-was-developed-step-by-step)
3. [Technology stack](#technology-stack)
4. [System architecture](#system-architecture)
5. [Project structure: where to find the code](#project-structure-where-to-find-the-code)
6. [End-to-end workflow](#end-to-end-workflow)
7. [Database design and data storage](#database-design-and-data-storage)
8. [How to run and test locally](#how-to-run-and-test-locally)
9. [Deployment and operational boundaries](#deployment-and-operational-boundaries)
10. [Testing, evidence, and current limitations](#testing-evidence-and-current-limitations)
11. [Detailed documentation](#detailed-documentation)

## System purpose and scope

The system replaces a paper-only certificate request process with a browser-based workflow. Its goal is to help residents submit requests and help authorized staff maintain a traceable review, payment, issuance, and verification history.

### Supported users

| Role | Main capabilities |
| --- | --- |
| **Resident** | Register/sign in, maintain own profile, request certificates, monitor statuses, cancel eligible pending requests, resubmit rejected requests, submit payment proof, and access own issued PDFs. |
| **Main Admin** | Handle administrative workflows, configure system/payment receiving settings and official signer information, review records, and access reports and logs. |
| **Barangay Secretary** | Handle authorized request and payment-review workflows and access appropriate administrative pages. System settings are **view-only** for this role. |

Role and ownership checks are performed server-side, not only by hiding navigation items.

### Certificate types and configured fees

| Type | Fee |
| --- | ---: |
| Barangay Clearance | ₱50 |
| Barangay Certificate / PAGPAPATUNAY | ₱50 |
| Barangay Residency | ₱50 |
| Barangay Indigency | Free |

The amounts reflect the currently implemented configuration. They should be checked against approved barangay fee policies before live operational use.

## How the system was developed (step by step)

This is an **implementation history reconstructed from the repository**. The early App Router/SQLite MVP already existed when later deployment work began; the notes below explain the logical build-up and identify milestone commits where available.

**Step 1 — Define requirements and the resident/staff process.** The project scope established three application roles, four certificate types, applicant data and purpose fields, request statuses, certificate fees, and the need for staff review. The early MVP already provided key public pages and certificate workflows; this README does not claim to document the original team meetings or wireframing dates.

**Step 2 — Build the web interface.** The application was organized using **Next.js App Router** pages for public, resident, and admin experiences. **React**, **TypeScript**, **Tailwind CSS**, and **daisyUI** provide forms, tables, responsive navigation, dashboards, and reusable components.

**Step 3 — Implement accounts, roles, and requests.** The system gained sign-in/registration, server-managed sessions, role and ownership checks, resident profiles, certificate-specific forms, server-generated request/control numbers, and staff actions for acceptance, rejection, cancellation, and resubmission. A local **SQLite** database supports development and tests.

**Step 4 — Implement certificate generation and verification.** Four certificate layouts were built from the supplied barangay reference formats. The system generates printable HTML and PDFs, stores issuance-time snapshots, provides QR/short-code verification, protects downloads, and records audit events. It also handles expiration, revocation, and reissue.

**Step 5 — Prepare an online, persistent deployment.** The repository introduced a database-provider boundary and a **Turso** backend for remote persistence, while keeping SQLite for local development and automated tests. A **Vercel Private Blob** adapter stores private certificate files separately from database rows. See [Turso provider milestone](https://github.com/lucifron28/Barangay-e-Certificate-system/commit/36ddf4abb) and [deployment guide](docs/deployment-vercel-turso.md).

**Step 6 — Replace the earlier simulated payment concept with manual GCash/Maya verification.** The current real-world design shows the barangay's configured receiving QR/account, requires the resident to pay **outside the website**, accepts payment reference, date/time, and screenshot evidence, and queues the claim for an authorized staff decision. Proof upload **does not** mark it paid. See [manual-payment milestone](https://github.com/lucifron28/Barangay-e-Certificate-system/commit/a7369cf6d).

**Step 7 — Improve official certificate signing and layouts.** Authorized signer names/images, private signature storage, immutable issued PDFs, barangay/municipal seals, and certificate-specific formats were refined. Newly issued Residency certificates now use **Barangay Chairman** rather than the earlier default **Acting Barangay Chairman**; historical snapshots keep the role recorded at issuance. See [signature workflow](https://github.com/lucifron28/Barangay-e-Certificate-system/commit/4a613bc14) and [structure alignment](https://github.com/lucifron28/Barangay-e-Certificate-system/commit/cb2a3c691).

**Step 8 — Test, harden, and document the system.** The repository added database/service tests, browser-based **Playwright** workflows, visual checks for certificate templates, authorization tests, environment validation, and deployment/operations documentation. QA uses clearly marked synthetic fixtures; simulated payment references are **not proof that real money moved**. See [certificate QA report](artifacts/certificate-structure-qa/QA-REPORT.md) and [payment QA report](artifacts/payment-qa/QA-REPORT.md).

**Step 9 — Deploy and perform client acceptance.** The application is deployed on **Vercel**, using **Turso** for the client/presentation database and private object storage for issued files. Deployment alone does not equal final barangay approval; print layout, authorized personnel/merchant accounts, notification setup, and operations policies require client acceptance.

For a history of actual code revisions, open the repository's [commit history](https://github.com/lucifron28/Barangay-e-Certificate-system/commits/main/). It is a more reliable source for precise changes than a reconstructed narrative.

## Technology stack

| Layer | Technology used | Role in the system |
| --- | --- | --- |
| Front end / server-rendered web app | **Next.js 16 App Router, React 19, TypeScript** | Pages, UI components, server actions, and API routes. |
| Styling / interface | **Tailwind CSS 4, daisyUI 5, Lucide** | Responsive layouts, components, and icons. |
| Validation / security | **Zod, scrypt password hashing, opaque server sessions** | Input checks, authentication, authorization, and server-only secrets. |
| Development / CI database | **SQLite, better-sqlite3** | Local persistence and isolated automated testing. |
| Deployed database | **Turso (@tursodatabase/serverless)** | Cloud storage for accounts, requests, payment records, and metadata. |
| Private file storage | **Local ignored storage / Vercel Private Blob** | Certificate PDFs, authorized signature assets, and protected payment proof files. |
| Documents / QR | **pdf-lib, qrcode, @zxing/browser** | PDF generation, verification QR codes, scanning/decoding. |
| Reports / notifications | **write-excel-file, Nodemailer** | Excel exports and optional SMTP email notifications. |
| Quality assurance | **Vitest, Playwright, ESLint, TypeScript checks** | Unit/integration tests, browser and visual tests, and static checks. |
| Hosting | **Vercel** | Deploys the Next.js application. |

**Supabase** support files remain in the repository as a legacy/alternative integration path; they are **not** the active Turso/Vercel deployment database.

## System architecture

```text
Resident / Main Admin / Barangay Secretary (web browsers)
                       |
                       v
              Next.js application on Vercel
                app/ + components/
                       |
             Server actions / API routes
                Authentication and
             role/ownership validation
                       |
                 lib/ services
            /                        \
           v                          v
  Database access layer       Certificate/payment file storage
  lib/db/queries.ts           lib/certificates/ and payment storage
     /         \                 /             \
   SQLite     Turso          Local files    Vercel Private Blob
 (local/CI) (deployed)       (local/CI)      (deployed)
                       |
         QR/short-code verification + audit logs
         Optional SMTP notification delivery
```

A browser action never directly receives a Turso token or a private Blob credential. Server-side services validate users and data, read/write permitted database records, and stream private files through authorized routes.

The application deliberately uses **no automated GCash/Maya payment gateway**. It records *submitted proof and staff verification decisions*, not wallet balances, deposits, or provider-confirmed settlement.

## Project structure: where to find the code

```text
Barangay-e-Certificate-system/
├── app/                    # Next.js App Router pages and API routes
│   ├── admin/              # Staff/admin dashboards, requests, payments, settings
│   ├── resident/           # Resident dashboard, requests, payments, certificates
│   ├── api/                # Protected document/proof/QR endpoints
│   └── verify/             # Public certificate verification and scanner
├── components/             # Reusable interface, forms, tables, certificates
├── lib/
│   ├── actions/            # Server-side form actions
│   ├── auth/               # Session and access guards
│   ├── certificates/       # Templates, PDFs, snapshots, file adapters
│   ├── db/
│   │   ├── queries.ts      # Provider-neutral database interface
│   │   ├── sqlite/         # SQLite database implementation
│   │   └── turso/          # Turso database implementation
│   ├── security/           # Input/rate-limit and security helpers
│   └── services/           # Multi-step business workflows (e.g., issuance)
├── database/migrations/    # Versioned SQL schema changes
├── types/                  # Shared TypeScript data types/enums
├── public/                 # Public assets such as approved seal derivatives
├── tests/                  # Vitest and browser/visual QA tests
├── scripts/                # Local setup, migrations, evidence and QA runners
├── docs/                   # Detailed deployment, operations, acceptance notes
├── artifacts/              # Selected QA reports; other generated evidence ignored
├── .github/workflows/      # CI build and test pipeline
├── .env.example            # Environment-variable template; NO real credentials
└── package.json            # Dependencies and npm scripts
```

Useful starting points for reading the implementation:

| Question | Where to look |
| --- | --- |
| How does a resident request a certificate? | `app/resident/`, `lib/actions/`, `lib/services/` |
| How do staff review requests and payments? | `app/admin/`, `lib/actions/` |
| How are login and role permissions enforced? | `lib/auth/`, `lib/security/` |
| Which database is used? | `lib/db/provider.ts`, `lib/db/queries.ts`, `lib/db/sqlite/`, `lib/db/turso/` |
| How is the PDF generated and signed? | `components/certificates/printable-certificate.tsx`, `lib/certificates/pdf-generator.ts`, `lib/certificates/historical-layout.ts`, `lib/services/certificate-issuance.ts` |
| Where are the database tables defined? | `database/migrations/` |
| How do QR verification and downloads work? | `app/verify/`, `app/api/`, `lib/certificates/` |
| How is the system tested and deployed? | `tests/`, `.github/workflows/ci.yml`, `docs/deployment-vercel-turso.md` |

## End-to-end workflow

### Resident request to issued certificate

```text
Resident signs in / registers
  -> selects one of four certificates and submits required details
  -> request receives a tracking number and initial status
  -> authorized staff reviews request
       -> reject with reason -> resident may resubmit
       -> accept -> proceed to fee evaluation
  -> if fee = ₱0: no payment required
  -> if fee > ₱0:
       resident selects an enabled GCash/Maya receiving method
       -> pays externally using the genuine wallet application
       -> enters reference number, transaction time, receipt image
       -> payment is PENDING (request is not paid)
       -> staff cross-checks merchant-account transaction history
            -> reject with reason -> resident may correct/resubmit
            -> approve only if money was actually received
  -> authorized issuer signs/issues the certificate
  -> private PDF becomes available to its resident
  -> verification code/QR can be checked on the public verify page
```

A fee-paying certificate **cannot** be issued merely because someone uploaded a screenshot or typed a reference. Staff must explicitly approve an eligible GCash/Maya payment after an off-platform account-history check. Free certificate requests bypass the payment requirement. Other actions include cancellation where allowed, revocation, reissue, and activity logging.

### Payment boundaries

- **Real operation:** Actual money moves in the resident's GCash/Maya app, outside this website; receiving records must be checked by staff.
- **In the system:** Proof submission creates a pending record; staff approve/reject it; the reviewer, time, remarks, and payment events are recorded.
- **During QA:** Synthetic reference numbers/receipts test the application workflow only. They are not real payment confirmations.
- **Production:** `PAYMENT_DEMO_MODE` is disabled at runtime under `NODE_ENV=production`; production environment checks reject enabling it.

### Certificate issuance and verification

The system creates a PDF with certificate-specific content, configured signer identity/image, seal assets, and a verification record. The issued document keeps an issuance-time snapshot so later changes to a name/title or signer do not silently rewrite an older certificate. PDF access uses authorization and stored SHA-256 integrity metadata. QR verification reports the record/status; it does **not** independently establish legal authenticity of the physical paper or constitute a cryptographic digital signature.

## Database design and data storage

The canonical SQL migrations are located in `database/migrations/`:

- `0000_initial_schema.sql` — main business entities.
- `0001_client_deployment.sql` — persistent session and deployment-related tables/metadata.
- `0002_full_online_workflow.sql` — transition of previous pickup-ready records to the secure online-download workflow.

Selected tables (refer to the SQL files for exact columns, relationships, and constraints):

| Table | Stores |
| --- | --- |
| `profiles` | Residents and staff profiles/role data. |
| `auth_sessions` | Revocable, hashed session tokens and expiry metadata. |
| `certificate_requests` | Applications, status, purpose, fee, and ownership. |
| `payments`, `payment_events` | Resident payment claims, proof metadata, decisions, and history. |
| `certificate_records`, `certificate_verifications` | Issued records, immutable snapshots, verification status/codes. |
| `certificate_download_logs`, `activity_logs` | Downloads and important staff/user actions. |
| `system_settings`, `document_counters` | Official configurations and unique-number counters. |
| `notification_logs`, `rate_limit_attempts` | Email attempt history and abuse controls. |

**Database choice:** Local/CI = **SQLite**; deployed client application = **Turso**. The code selects a provider through `DATABASE_PROVIDER` and calls the shared `lib/db/queries.ts` interface. Turso mode fails when its credentials are missing instead of silently switching to local SQLite.

**File choice:** PDFs, payment proof images, and private signatures belong in private storage; database rows hold relevant storage keys/provider and integrity metadata. Production certificate files use **Vercel Private Blob**, not public URLs.

## How to run and test locally

You need Node.js and npm compatible with this repository, plus access to the local source code. These commands are for a **local development copy**, not for deployment:

1. Clone the repository and install its locked dependencies:

   ```bash
   git clone https://github.com/lucifron28/Barangay-e-Certificate-system.git
   cd Barangay-e-Certificate-system
   npm ci
   ```

2. Copy `.env.example` into a private `.env.local` file and configure a **local-only** SQLite environment:

   ```env
   DATABASE_PROVIDER=sqlite
   SQLITE_DATABASE_URL=file:./data/dev.sqlite
   CERTIFICATE_STORAGE_PROVIDER=local
   SESSION_COOKIE_SECRET=<generate-a-new-secret-of-at-least-32-characters>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Never use real production Turso/Blob/SMTP credentials for a local demo, and never commit the local environment file.

3. Apply the local schema, start the application, and open `http://localhost:3000`:

   ```bash
   npm run db:migrate
   npm run dev
   ```

   Local role/test accounts require a separate authorized setup; do not assume publicly listed credentials work. Local-only demo reset/seed commands exist for isolated test data and **must never be used on Turso production**.

4. Validate the project:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

The GitHub Actions workflow in `.github/workflows/ci.yml` performs dependency installation, an isolated SQLite test setup, Chromium installation, lint, typecheck, build, and automated tests. For the full operational setup, use [deployment instructions](docs/deployment-vercel-turso.md), not the local examples above.

## Deployment and operational boundaries

| Setting | Local / test | Client/presentation deployment |
| --- | --- | --- |
| Application | Local Next.js server | Vercel (HTTPS) |
| Database | SQLite | Turso |
| Private certificate storage | Ignored local directory | Vercel Private Blob |
| Authentication | Server-side sessions | Server-side sessions with secure deployment settings |
| Email | Optional/not required for local work | Nodemailer SMTP integration, subject to approved credentials |
| Payment | Clearly labelled controlled QA when used | Real external GCash/Maya transfers **manually verified** by staff |

Production-like configuration needs the appropriate Turso URL/token, private Blob token, session cookie secret, public HTTPS app URL, and approved SMTP settings if notifications are enabled. **Do not put any actual values in Git.** `npm run check:production-env` checks required production variables and currently also requires SMTP sender details; it may fail when email has intentionally not been configured even though the web app can skip notification delivery.

Operational rules:

- **Preserve existing accounts and their sessions:** Normal code/documentation updates do not require seeding, database resets, password changes, or direct SQL modifications.
- **Do not run Turso demo/account seed scripts** against an existing client database; some seed tools are capable of updating seeded passwords and invalidating sessions.
- Migrate schemas using the reviewed, forward-only migration procedure and a client-approved backup plan.
- Never publish private PDFs, resident documents, raw payment receipts, official signer artwork, tokens, or real account passwords.
- Review printer output and authorized signer/merchant settings with the barangay before real operational use.

The live URL is a deployment location, **not a guarantee that the latest GitHub commit is deployed**. Check the current Vercel deployment's commit and status during each release.

## Testing, evidence, and current limitations

The repository contains automated unit/integration tests and Playwright browser/visual checks. Two documented QA efforts are:

- [Payment simulation research and QA report](artifacts/payment-qa/QA-REPORT.md) — controlled synthetic GCash/Maya proof workflows and verification logic.
- [Certificate structure and visual QA report](artifacts/certificate-structure-qa/QA-REPORT.md) — four certificate templates, signer-title fixes, Letter print checks, and viewport comparisons.

These are **reports of specific past test runs**, not proof of a new run against every future deployment. Synthetic payment approvals in a QA record are not evidence of actual GCash/Maya settlement.

Known acceptance boundaries:

- Certificate formats were adapted to historical samples; **final printed placement, seal size, and official wording require barangay approval**.
- The signature currently represents an embedded **visual electronic signature image**, not a legally verified cryptographic digital signature.
- The final monthly-report presentation, notification sender/delivery, data retention/backup procedures, and operational merchant/authorized personnel policies require approved client configuration.
- Supabase code and local/demo QA scripts are retained for development/compatibility but are not part of the real-payment production workflow.
- No automated financial settlement, refund, reconciliation API, or bank/GCash/Maya webhook is implemented.

## Detailed documentation

For group research, system evaluation, or developer handoff, continue with:

| Document | Purpose |
| --- | --- |
| [Certificate template alignment](docs/certificate-template-alignment.md) | Original-format comparison and print limitations. |
| [Manual GCash/Maya workflow](docs/manual-payment-workflow-and-reconciliation.md) | Payment/reference/proof and staff reconciliation boundary. |
| [Operations guide](docs/operations.md) | Staff request, certificate, payment, and security procedures. |
| [Vercel and Turso deployment](docs/deployment-vercel-turso.md) | Deployment preparation and credentials/migration handling. |
| [Client acceptance checklist](docs/client-acceptance-checklist.md) | Manual functional and release-acceptance checks. |
| [Client acceptance runbook](docs/client-acceptance-runbook.md) | Practical acceptance test sequence. |
| [Client readiness notes](docs/client-readiness.md) | Earlier handoff context; verify operational status against current deployment. |

**Information handling:** The GitHub repository is publicly visible. Do not add real resident records, financial screenshots, authentication secrets, or private original certificate assets. Staff credentials should be shared securely outside the repository.

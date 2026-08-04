# Thesis Defense Baseline Audit

Date: August 4, 2026
Branch: `feat/thesis-defense-readiness`
Baseline commit: `777434d` from the preserved responsive UI/auth work

## Reproducible Setup Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm ci` | Passed on retry | The first attempt was interrupted by a locked `lightningcss` native binary while a local Node process held the file. A second clean install from the existing lockfile succeeded. |
| `npm run db:sqlite:reset` | Passed | Recreated `data/dev.sqlite` with the current synthetic demo data. |
| `npm run lint` | Passed | No lint errors. |
| `npm run typecheck` | Passed | No TypeScript errors. |
| `npm run build` | Passed | Next.js 16.2.6 production build completed. |

`npm ci` reports ESLint 10 peer-dependency warnings from transitive Next.js
plugins and eight transitive dependency advisories. These are baseline package
risks; no forced upgrades were applied during the audit.

## Current Implemented Modules

- Next.js App Router pages for public, resident, and admin workflows.
- SQLite local-demo persistence with hashed local credentials and cookie sessions.
- Supabase SSR utilities and prepared SQL migrations for future deployment.
- Resident registration, login, profile editing, request submission, cancellation,
  rejected-request resubmission, request history, and pickup visibility.
- Admin request review, scheduling, resident records, reports, activity logs, and
  settings display.
- Responsive mobile card alternatives for dense tables and a daisyUI theme switcher.
- Printable HTML certificate preview plus protected server PDF/report export routes.
- Notification log abstraction with safe skipped-email behavior when unconfigured.

## Gaps Found Against Defense Requirements

- Local session signing falls back to a generated secret; Phase 1 will require
  `LOCAL_DEMO_SECRET` and use constant-time token verification.
- No persisted rate limiting, security-header policy, or generic auth hardening.
- Certificate request date may be supplied by a form and sequence values use
  `COUNT(*) + 1`; Phase 2 will replace this with transactional counters.
- The status model is pickup-centric and does not yet include `ready_for_download`.
- Payments are only a status field; there is no mock checkout or payment history.
- Certificate records are mutable upserts and PDFs are not immutable private final
  issuance artifacts with hashes.
- QR verification, verification expiry, revocation, reissue, resident certificate
  download history, and public privacy-minimized verification are absent.
- Existing seeds use fixed historical dates and do not demonstrate the complete
  online-defense state model.
- No automated test suite or CI workflow exists yet.

## Demo Accounts

All current seeded accounts use `password123` after `npm run db:sqlite:reset`:

| Role | Email | Username |
| --- | --- | --- |
| Main Admin | `admin@example.com` | `mainadmin` |
| Barangay Secretary | `secretary@example.com` | `secretary` |
| Resident | `resident@example.com` | `juanresident` |
| Resident | `maria.resident@example.com` | `mariaresident` |

## Phase Checklist

- [x] Phase 0: baseline audit and reproducible setup
- [ ] Phase 1: security hardening
- [ ] Phase 2: request workflow correction
- [ ] Phase 3: mock online payment
- [ ] Phase 4: immutable certificate issuance
- [ ] Phase 5: QR verification
- [ ] Phase 6: secure resident release
- [ ] Phase 7: revocation and reissuance
- [ ] Phase 8: UI, copy, report, and seed polish
- [ ] Phase 9: automated workflow tests
- [ ] Phase 10: CI quality gates
- [ ] Phase 11: thesis defense documentation
- [ ] Phase 12: final clean validation

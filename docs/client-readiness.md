# Client Deployment Readiness

## Purpose

This document describes the current handoff state of the Barangay Bato e-Certificate System. It is an operational readiness document for client preview and deployment, not a defense rehearsal.

## Current Architecture

    Local development / CI
    Next.js -> SQLite -> ignored local certificate directory

    Client preview / production
    Next.js on Vercel -> Turso -> Vercel Private Blob -> Gmail SMTP

The application selects its database with DATABASE_PROVIDER:

- sqlite: local persistence, local auth sessions, and local private files.
- turso: asynchronous remote persistence, persistent sessions, and private Blob certificate storage.
- supabase: retained legacy/future code path, not the current target.

The application never falls back from Turso to SQLite when remote credentials are missing.

## Ready In The Repository

- Four certificate types and their confirmed request fields.
- SQLite local mode with synthetic seed data.
- Turso async repository boundary and canonical migrations.
- Persistent, revocable opaque-token sessions.
- Atomic year-scoped request, control, and certificate counters.
- Private local storage and Vercel Private Blob adapter.
- Protected download routes, SHA-256 integrity checks, and download audit.
- Immutable certificate snapshots, 72-hour expiry, QR verification, revocation, and reissue.
- Gmail SMTP utility with test credential isolation.
- Printable PDF and Excel report paths.
- Client deployment, operations, and acceptance documentation.

## Blocked On Client Resources

- Approved Vercel project and final HTTPS domain.
- Turso database, database-scoped token, and selected region.
- Vercel Private Blob store and token/OIDC configuration.
- Gmail sender account, App Password, and safe test recipient.
- Main Admin identity and controlled bootstrap procedure.
- Official Captain name, signature asset, seal asset, and print approval.
- Final report format, retention policy, and payment-status policy.

## Release Gates

1. Run local validation and confirm CI is green.
2. Create separate Preview resources. Do not import data/dev.sqlite.
3. Apply versioned Turso migrations and verify migration status.
4. Configure private Blob storage and verify no public certificate URL is used.
5. Configure the production-like environment check without exposing values.
6. Bootstrap only synthetic Preview users and requests.
7. Execute the client acceptance checklist.
8. Compare fresh four-template outputs with the supplied references.
9. Test Gmail with an approved recipient and inspect notification logs.
10. Confirm final domain, assets, report form, retention policy, and payment decision before production promotion.

## Security Boundaries

- Turso credentials, Blob tokens, SMTP passwords, and session secrets are server-only environment values.
- Certificate PDFs are never stored in Turso and are never published through a public Blob URL.
- Resident downloads require current authenticated ownership.
- Admin downloads require current admin authorization.
- Certificate bytes are hash-checked before streaming.
- Failed issuance removes a newly uploaded object on a best-effort basis and releases the retryable reservation; it cannot mark a request issued by itself.
- The payment workflow uses manual GCash and Maya verification against official merchant records. No automated payment gateway API or webhook integration is used.

## Validation Commands

    npm ci
    npm run db:sqlite:reset
    npm run lint
    npm run typecheck
    npm test
    npm run build
    npm run check:production-env

The production environment check is expected to fail without real approved deployment values. It must not be bypassed by committing placeholder secrets.

## Handoff Decision

The repository is ready for controlled Preview setup. It is not a production deployment by itself. The remaining work is resource configuration, client acceptance, visual print approval, and explicit approval of operational policies.

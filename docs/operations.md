# Operations Guide

## Daily Request Workflow

1. Resident submits a request with saved profile data and certificate-specific fields.
2. Admin reviews completeness and accepts or rejects with remarks.
3. Accepted paid requests complete the clearly labeled online thesis/demo payment
   simulation; Indigency requests are free.
4. Admin issues the certificate, reviews the generated PDF, and confirms the
   notification attempt.
5. Residents download through the authenticated route. A successful download
   completes the request as `done`.

## Roles

Main Admin controls system settings and all administrative workflows. Barangay
Secretary handles request review, issuance, reports, and activity logs.
Residents can edit only their own profile and view only their own
request/certificate data.

## Certificate Issuance

Issuance fixes the official issue timestamp, certificate number, verification expiry, and immutable snapshot before rendering. The expiry is exactly 72 hours from issuance. The PDF is hashed, stored privately, and finalized with the database record. A concurrent attempt is rejected by the issuance reservation. A failed upload/finalization cannot make the request issued.

The displayed Captain name/signature is a visual placeholder until approved client assets are supplied. It is not a legally verified digital signature.

## Download And Verification

The browser calls the application download route. The server authenticates, checks ownership/role, checks issued/revoked/expired state, loads the private local or Blob artifact, recomputes SHA-256, writes a success/denial log, and streams the bytes with private cache headers. It never redirects to a public storage URL.

Verification QR codes identify the system record and status. Verification does
not independently establish legal authenticity or replace the visual signature
approval process.

## Payment Boundary

The current payment screen is a thesis/demo simulation and does not process
cards, bank transfers, or real online funds. The status values are `unpaid`,
`paid`, and `free`. Any real payment provider requires a separate client
decision, credentials, security review, and implementation goal.

## Email

Gmail SMTP sends accepted, rejected, and certificate-ready notifications when
configured. Missing values produce a safe skipped attempt; SMTP errors are
sanitized and logged. Use a Gmail App Password, not the normal account
password.

## Data And Secrets

- Never commit environment files, tokens, passwords, client PDFs, or generated PDFs.
- Never import data/dev.sqlite into Turso.
- Never run a destructive reset against a remote database.
- Keep Blob objects private.
- Use database-scoped Turso tokens and rotate them after suspected exposure.
- Test backups/restores against a separate database before relying on them.
- Use synthetic records in Preview until live-data handling is approved.

## Incident Handling

For a missing or corrupted certificate, inspect the certificate record, storage provider/key metadata, SHA-256 value, issuance reservation, and download logs. Do not regenerate an issued certificate from mutable profile data. Revoke and reissue through the supported workflow when appropriate.

For a suspected credential leak, revoke/rotate the affected Turso token, Blob token, Gmail App Password, or session secret, review logs, and force a controlled re-login if required. Do not paste secrets into an issue or chat transcript.

## Maintenance

Run local validation before each release:

    npm ci
    npm run db:sqlite:reset
    npm run lint
    npm run typecheck
    npm test
    npm run build

For a remote migration, run npm run db:migrate:turso from an approved operator environment and then npm run db:status. Keep migration files forward-only and review the diff before applying them.

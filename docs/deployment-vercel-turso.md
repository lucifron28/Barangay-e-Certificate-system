# Vercel And Turso Deployment Guide

This guide records the controlled Vercel/Turso rollout for the thesis/demo.
Do not use a local SQLite file as a production database and do not import
`data/dev.sqlite`.

## Current Deployment Status

The Vercel project is linked and the production deployment is live:

- Production: <https://barangay-bato-ecertificate-system.vercel.app>
- Latest Preview: <https://barangay-bato-ecertificate-system-8d0xzsn6w-ron-cada-projects.vercel.app>
- Project: `barangay-bato-ecertificate-system`
- Turso migrations: `0000_initial_schema.sql` and
  `0001_client_deployment.sql` applied; no pending migrations.
- Storage: private Vercel Blob store linked to Production, Preview, and
  Development.

This is a controlled thesis/demo deployment. SMTP delivery and production
admin account bootstrap are still pending, so the deployment is not yet an
operational barangay service.

## 1. Prepare Accounts And Resources

Obtain explicit access to the intended Vercel team/project, a Turso organization and database, a Vercel Blob store configured for private objects, the approved Gmail sender account, and the final or Preview HTTPS domain. Do not guess a project, database, region, or billing target.

## 2. Create The Turso Database

Use the current Turso CLI flow:

    turso auth login
    turso db create barangay-bato-ecert
    turso db show barangay-bato-ecert --url
    turso db tokens create barangay-bato-ecert

Use a database-scoped token. Store it in the Vercel environment or an approved secret manager. Rotate it if it is exposed. Do not commit it or include it in logs or screenshots.

## 3. Configure Vercel Preview

Connect the GitHub repository to the approved Vercel project. Configure these values for Preview first:

    DATABASE_PROVIDER=turso
    TURSO_DATABASE_URL=<database-scoped-url>
    TURSO_AUTH_TOKEN=<database-scoped-token>
    CERTIFICATE_STORAGE_PROVIDER=vercel_blob
    BLOB_READ_WRITE_TOKEN=<private-blob-token>
    SESSION_COOKIE_SECRET=<32-or-more-random-characters>
    NEXT_PUBLIC_APP_URL=https://<preview-domain>
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    SMTP_SECURE=true
    SMTP_USER=<approved-gmail-address>
    SMTP_PASS=<gmail-app-password>
    EMAIL_FROM=Barangay Bato e-Certificate <approved-gmail-address>

The application uses the full-online certificate workflow in every deployed
environment. Do not add a certificate issuance mode variable. Do not use
LOCAL_DEMO_SECRET as the production session secret.

## 4. Configure Private Blob

Use Vercel Private Blob, not public Blob storage. The application calls the server-side Blob API with access: "private"; it does not expose a permanent Blob URL to residents or admins. Keep the token server-only. If the connected Vercel project supports project OIDC for the selected Blob workflow, prefer the current Vercel-supported OIDC configuration; otherwise use the approved BLOB_READ_WRITE_TOKEN value.

## 5. Apply Migrations

Run the migration script from a trusted operator environment with Preview database values loaded:

    DATABASE_PROVIDER=turso npm run db:migrate:turso
    DATABASE_PROVIDER=turso npm run db:status

Expected files are 0000_initial_schema.sql, 0001_client_deployment.sql, and
0002_full_online_workflow.sql. The runner creates schema_migrations, applies
files in order, and does not drop existing production tables.

## 6. Bootstrap The First Admin

Do not use a public registration form to create an admin account. Use a controlled operator bootstrap against the approved Preview database, create the Main Admin and Barangay Secretary identities, and record the action in the handoff log. A bootstrap script should be added or approved for the selected resource before live use; local seeded accounts are not production credentials.

## 7. Configure Gmail SMTP

Enable two-step verification on the approved Gmail account and create an App Password. The App Password is not the normal Gmail password. Configure port 465 with secure SMTP. Send first to an approved synthetic recipient, verify the message and notification log, then test accepted, rejected, and certificate-ready events.

## 8. Run The Production Gate

    npm run check:production-env

The command reports missing variable names only. A successful result confirms environment shape, not remote resource health; migration, storage, email, and acceptance checks are still required.

## 9. Preview Acceptance

Use only synthetic Preview records. Test registration, login/logout, all four request types, review decisions, simulated online payment, PDF issuance, PDF download, QR verification, expiry, revocation, reissue, reports, email, mobile navigation, and persistence after a Vercel redeploy. Follow the client acceptance checklist. The payment screen is a thesis/demo simulation and must not be treated as a real gateway.

## 10. Production Handoff Gate

The Vercel production alias is already deployed for thesis/demo testing. Before
operational use, confirm the final HTTPS domain, Vercel project and Turso
database ownership, private Blob ownership, Gmail sender and test recipient,
Main Admin and Barangay Secretary identities, Captain name and signature/seal
assets, report format, retention policy, and payment-status policy.

Before generating production certificates, set NEXT_PUBLIC_APP_URL to the final public HTTPS URL so QR codes do not contain a Preview address.

## Backups And Rotation

Use current Turso-supported export/backup tools approved by the operator. Test restoration against a separate database. Rotate Turso tokens, Blob tokens, SMTP App Passwords, and session secrets through Vercel/environment management, never through source control. A session-secret rotation policy should include a controlled user re-login notice.

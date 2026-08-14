# Client Acceptance Runbook

This runbook turns the checklist into a repeatable Preview session. Use only synthetic data until the client signs off on live data handling.

## Before The Session

1. Confirm the Preview URL is HTTPS and points to the correct Vercel project.
2. Confirm DATABASE_PROVIDER=turso and migration status is complete.
3. Confirm private Blob configuration without exposing its token.
4. Confirm the approved Gmail test recipient.
5. Create synthetic Preview records through an approved operator process. Never upload data/dev.sqlite.
6. Prepare one synthetic record for each certificate type, one rejected request, one accepted unpaid request, and one issued/revoked request.

## Resident Pass

1. Open Home and About on desktop and phone browsers.
2. Register a synthetic resident and confirm validation messages.
3. Log in, inspect the prefilled profile, edit one safe profile field, and log the update.
4. Submit all four certificate types. Confirm request numbers, fees, payment defaults, and submitted fields.
5. Cancel one pending request. Confirm an accepted request cannot be cancelled.
6. Use an admin rejection, edit the rejected request, and resubmit it.
7. Confirm the resident cannot view another resident's request or logs.

## Admin Pass

1. Sign in as Main Admin and inspect dashboard, requests, reports, and logs.
2. Sign in as Barangay Secretary and confirm the workflow works but settings remain view-only.
3. Accept a complete request and confirm the accepted notification attempt.
4. Reject another request with a required reason and confirm the rejection notification attempt.
5. Complete the simulated online payment for an accepted paid request.
6. Issue the certificate as an admin and download it as the owning resident.
7. Confirm the successful download marks the request done and no office-pickup
   controls are offered.

## Certificate Pass

1. Generate a fresh synthetic certificate for each of the four templates.
2. Compare spacing, official labels, fields, Captain name, signature placeholder, QR, and footer with private references.
3. Download as an authorized resident and as an admin.
4. Confirm each download is streamed by the application, not redirected to a Blob URL, and appears in the audit log.
5. Use an integrity-mismatch fixture to confirm SHA-256 denial.
6. Confirm the exact expiry boundary, revocation, and reissue behavior.

## Email Pass

1. Send accepted, rejected, and certificate-ready messages to the approved synthetic recipient.
2. Confirm sender, subject, and secure-download wording.
3. Remove SMTP values in Preview only if skip behavior is being tested; confirm the main action still succeeds and the attempt is logged.
4. Confirm no SMTP password appears in UI, logs, CI output, or PDF content.

## Persistence Pass

1. Record request, certificate, and activity identifiers.
2. Redeploy the Preview branch through Vercel.
3. Confirm records remain in Turso.
4. Confirm private PDFs remain in Blob and still download through the app.
5. Scan one QR using a physical phone and confirm the deployed HTTPS domain is used.

## Closeout

1. Attach the completed checklist and visual comparison notes.
2. Record defects with URL, role, request number, and synthetic data only.
3. Obtain decisions for assets, print layout, monthly report, payment policy, retention, sender, and final domain.
4. Remove synthetic Preview data where practical before client use.
5. Do not promote to production until all release gates are approved.

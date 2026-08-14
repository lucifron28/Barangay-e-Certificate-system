# Client Acceptance Checklist

Use synthetic names and records until the client authorizes real data. Record the date, environment URL, tester, result, and notes for every item.

## Public And Resident

- [ ] Home page opens on desktop and phone browser.
- [ ] About page describes the four documents and physical/legal boundaries.
- [ ] Resident registration validates required fields, email, and password confirmation.
- [ ] Resident login and logout work.
- [ ] Expired or revoked sessions require login again.
- [ ] Resident profile values prefill a new request.
- [ ] Resident can edit their own profile.
- [ ] Resident cannot edit another resident's profile.
- [ ] Clearance request submits Name, Age, Sitio, and Purpose.
- [ ] Certificate/Pagpapatunay request submits Name, Age, Place of Birth, and Purpose.
- [ ] Indigency request submits Name, Age, Sitio, and Purpose.
- [ ] Residency request submits Name, Age, Birthdate, Sitio, Years of Residency, and Purpose.
- [ ] Fee and payment state display correctly for every type.
- [ ] Request number and Clearance control number are generated correctly.
- [ ] Resident sees only their own requests, schedules, and certificates.
- [ ] Resident can cancel a pending request.
- [ ] Resident cannot cancel an accepted request.
- [ ] Resident can edit and resubmit a rejected request.

## Admin Workflow

- [ ] Main Admin login redirects to the admin dashboard.
- [ ] Barangay Secretary login redirects to the admin dashboard.
- [ ] Main Admin can update approved system settings.
- [ ] Barangay Secretary sees settings but cannot change them.
- [ ] Admin can filter and inspect all requests.
- [ ] Admin can accept a complete pending request.
- [ ] Admin rejection requires remarks.
- [ ] Accepted requests cannot be rejected later.
- [ ] Resident can complete the clearly labeled simulated online payment where applicable.
- [ ] Admin can issue a paid or free certificate as a secure PDF.
- [ ] Resident can download an issued PDF through the authenticated route.
- [ ] A successful certificate download marks the request done.
- [ ] Residents cannot see activity logs.
- [ ] Admin can inspect activity and notification logs.
- [ ] Reports filter by date, type, status, and resident.
- [ ] Reports print, download as PDF, and export to Excel.

## Certificates And Storage

- [ ] Barangay Clearance PDF output is visually compared with the reference.
- [ ] Barangay Certificate/Pagpapatunay PDF output is visually compared with the reference.
- [ ] Barangay Indigency PDF output is visually compared with the reference.
- [ ] Barangay Residency PDF output is visually compared with the reference.
- [ ] Captain name and approved visual signature asset are correct.
- [ ] Signature disclaimer is visible and does not claim legal verification.
- [ ] QR opens the final deployed HTTPS domain.
- [ ] Authorized resident download succeeds.
- [ ] Unauthorized resident download is denied and logged.
- [ ] Admin download succeeds and is logged.
- [ ] PDF SHA-256 mismatch denies the download.
- [ ] Expired verification denies the download.
- [ ] Revoked verification denies the download.
- [ ] Reissue creates a new number and preserves the old audit record.
- [ ] PDF remains available after a Vercel redeploy.

## Email And Mobile

- [ ] Accepted request email is received by the approved test recipient.
- [ ] Rejected request email includes the entered remarks.
- [ ] Certificate-ready email identifies the secure PDF download.
- [ ] Missing SMTP configuration does not fail the main action.
- [ ] SMTP errors are sanitized in the UI and logged safely.
- [ ] Mobile navigation opens and closes correctly.
- [ ] Mobile forms and tables do not overlap or require unintended horizontal scrolling.
- [ ] Certificate preview and QR remain readable on a phone.

## Persistence And Handoff

- [ ] Turso migration status shows all expected files applied.
- [ ] Data remains after a Vercel redeploy.
- [ ] Private Blob objects remain available after a Vercel redeploy.
- [ ] No local data/dev.sqlite was imported into Turso.
- [ ] No public certificate Blob URL is present.
- [ ] No online payment provider is enabled without separate approval.
- [ ] Final domain, report format, assets, retention policy, and payment policy are signed off.

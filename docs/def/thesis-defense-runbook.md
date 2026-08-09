# Thesis Defense Runbook

This runbook is for the local SQLite thesis demonstration. It uses synthetic
accounts and sample records only. The default demo mode is
`fully_online_demo`; its payment is simulated and transfers no actual funds.

## Before the Demonstration

1. Copy `.env.example` to `.env.local`.
2. Set `LOCAL_DEMO_SECRET` to a private random value with at least 32
   characters.
3. Keep `DATABASE_PROVIDER=sqlite` and
   `CERTIFICATE_ISSUANCE_MODE=fully_online_demo`.
4. Confirm that the laptop and test phone are on the same network if a phone
   QR scan will be demonstrated.

## Main Workflow

1. Reset the presentation data:

   ```bash
   npm run demo:reset
   ```

   The command prints the demo credentials and fresh sample verification URLs.
   It also creates real sample PDFs and matching verification records.

2. Start the application:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`. For a phone, use the laptop LAN address,
   such as `http://192.168.1.20:3000`, and set `NEXT_PUBLIC_APP_URL` to that
   reachable address before resetting the demo.

3. Log in as `resident@example.com` with password `password123`.
4. Open Request Certificate and submit a request. Select the certificate type
   to show that only the relevant fields are displayed.
5. Log out and log in as `admin@example.com` with password `password123`.
6. Open Certificate Requests and accept the new pending request after checking
   its submitted information.
7. Log out and log in again as `resident@example.com`.
8. Open the accepted request and complete the mock payment. The page must show
   `DEMO PAYMENT - NO ACTUAL FUNDS TRANSFERRED`.
9. Use the failed or cancelled payment sample to demonstrate Retry Demo
   Payment. Previous attempts remain visible in payment history.
10. Log out and log in as the Main Admin.
11. Open the accepted paid request and issue the certificate. An unpaid request
    must not show an ordinary generation action.
12. Log out and log in as the resident.
13. Open the issued certificate and download the secure PDF. The download is
    available only to the owning resident while the certificate is valid.

## Verification Demonstration

1. Copy the `VALID`, `EXPIRED`, and `REVOKED` URLs printed by
   `npm run demo:reset`.
2. Open the valid URL and show `VALID`, the certificate number, masked resident
   name, verification code, expiry, and short PDF fingerprint.
3. Open the expired URL and show `EXPIRED`.
4. Open the revoked URL and show `REVOKED` and the replacement information when
   available.
5. Scan the valid QR code using a phone only after a human has tested the
   reachable LAN URL. This is a manual demonstration step; repository checks
   must not be described as a physical phone scan.

## Administration Demonstration

1. Open Activity Log as Main Admin and show request submission, acceptance,
   payment, issuance, download, and revocation events.
2. Open Reports and show the filtered summary, printable view, PDF download,
   and Excel export.
3. Open Settings as Main Admin. A Barangay Secretary can view settings but
   cannot submit the settings update action.
4. Switch among `barangay-bato`, `light`, `corporate`, `winter`, `business`,
   and `night` from the theme switcher.
5. Resize to a phone viewport and show the mobile navigation and card-based
   tables.
6. Log out and confirm the public login page is displayed.

## Hybrid Workflow Note

To demonstrate the older office workflow, set
`CERTIFICATE_ISSUANCE_MODE=hybrid_physical_original`, reset the database, and
restart the app. Pickup schedules, office payment recording, ready-for-pickup,
and done-after-claiming controls return in that mode. Do not mix hybrid wording
into the default fully-online defense flow.

## What to Explain

Explain that this is a thesis prototype using local SQLite, hashed demo
passwords, simulated payment, private local certificate PDFs, a 72-hour QR
verification window measured from issuance, and a visual signature placeholder.
Explain that expired/revoked certificates remain visible for status evidence but
cannot be downloaded, and that the QR result does not prevent photocopying.
Explain the production and legal limitations in
`docs/def/security-and-legal-limitations.md`.

# Final Defense Readiness

This is the final rehearsal guide for the Barangay Bato e-Certificate System
thesis/demo. The default path is local SQLite with synthetic data.

## Automated gate

Run these commands from a clean checkout:

```bash
npm ci
npm run demo:reset
npm run lint
npm run typecheck
npm test
npm run build
```

Expected current result: 8 test files and 39 tests pass. `npm test` resets
`data/test.sqlite` and `data/certificates-test/`, so it does not overwrite the
presentation database or its generated PDFs. `npm run demo:reset` resets the
presentation database at `data/dev.sqlite` and prints fresh valid, expired, and
revoked verification URLs.

## Manual smoke gate

1. Run `npm run demo:reset` with `DATABASE_PROVIDER=sqlite` and
   `CERTIFICATE_ISSUANCE_MODE=fully_online_demo`.
2. Start with `npm run dev` and sign in as the resident, Main Admin, and
   Barangay Secretary demo accounts.
3. Submit a request, accept it, complete the mock payment, issue the PDF, and
   download it as the owning resident.
4. Open the valid, expired, and revoked verification URLs printed by reset.
5. Open the admin request detail and show payment attempts, notification
   history, activity log, reports, and settings.
6. Switch through `barangay-bato`, `light`, `corporate`, `winter`, `business`,
   and `night` themes.
7. Resize to a phone viewport and check navigation, request forms, tables, and
   certificate cards for clipping or horizontal overflow.
8. Scan a valid QR code with a physical phone over a reachable LAN URL. This is
   the only final gate that cannot be performed by automated repository checks.

## Evidence and privacy

- Use only the seeded synthetic names and values in screenshots or slides.
- Keep `docs/client-assets/certificate-templates/original/` private and ignored
  by Git; these PDFs are layout references and are not fillable forms.
- Do not commit `.env.local`, SQLite files, generated PDFs, QR screenshots, or
  real resident information.
- Retain the generated PDF fingerprint and verification URLs only in a private
  defense evidence folder outside the repository.

## Claims to make accurately

- This is a thesis/demo system, not an authorized production government
  service.
- Payment is simulated and transfers no money.
- The displayed signer is a visual placeholder, not a legally verified digital
  signature.
- QR verification shows issuance/status and does not prevent photocopying.
- SQLite is the fully validated end-to-end mode; Supabase migrations and SSR
  utilities are prepared but require a confirmed project and live RLS testing.

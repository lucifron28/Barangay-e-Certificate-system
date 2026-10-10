# Barangay Bato e-Certificate System: Certificate Signer Title & Structure QA Report

**Date:** October 11, 2026  
**System:** Barangay Bato e-Certificate System  
**Repository:** `lucifron28/Barangay-e-Certificate-system`  
**Production URL:** `https://barangay-bato-ecertificate-system.vercel.app`

---

## 1. Executive Summary

This report documents the correction from “ACTING BRGY CHAIRMAN” to “BARANGAY CHAIRMAN” for newly issued Residency certificates, preservation of issuance-time signer roles, and alignment of certificate copy, headings, verification QR, and metadata between HTML preview and PDF output.

All four templates passed local automated tests, Playwright QA, static checks, and production build. GitHub CI passed on the final application commit, and the production deployment is `READY`.

---

## 2. Issues & Root Cause Analysis

### Issue 1: Outdated Signer Title for Barangay Residency
- **Problem:** Newly issued Barangay Residency certificates defaulted to `"Acting Barangay Chairman"` in `lib/certificates/template-copy.ts`.
- **Root Cause:** A historical interim role string was hardcoded in `CERTIFICATE_TEMPLATE_SIGNATURE_ROLES.barangay_residency`.
- **Resolution:** Updated `CERTIFICATE_TEMPLATE_SIGNATURE_ROLES.barangay_residency` to `"Barangay Chairman"`. Newly issued certificates now inherit this role while keeping `barangay_certificate` as `"PUNONG BARANGAY"`.

### Issue 2: Historical PDF Renderer Ignored Saved Issuance Snapshot Role
- **Problem:** `lib/certificates/historical-layout.ts` rendered the signature block using `certificateTemplateSignatureRole(type)` directly inside `drawSignature()` instead of honoring `snapshot.authorized_official_role`.
- **Root Cause:** The PDF renderer bypassed the issuance snapshot for the role field, meaning any past certificate issued under an authorized acting officer (or custom designation) would be overwritten dynamically upon re-download.
- **Resolution:** Refactored `drawSignature()` to accept `signatureRole?: string` and updated `generateHistoricalCertificatePdf` to pass `snapshot?.authorized_official_role ?? certificateTemplateSignatureRole(type)`. Historical records now remain strictly intact without silent rewrites.

### Issue 3: HTML Preview vs. PDF Document Structure Mismatch
**Problem:** `components/certificates/printable-certificate.tsx` used a generic office header and body copy that diverged from the certificate-specific historical PDF renderer.
**Root Cause:** Certificate wording and headings were maintained separately in HTML and PDF code.
**Resolution:** Centralized office titles, header lines, and body runs in `lib/certificates/template-copy.ts`. Both renderers now use the same source for paragraphs, bold runs, issue statements, and headings. Exact client print approval remains distinct from this structural alignment.

### Issue 4: HTML preview lacked a working verification QR and metadata
- **Problem:** Issued HTML previews showed certificate/request/control numbers but omitted the verification short code, expiry, and QR.
- **Root Cause:** The full QR token is stored only as a hash. The preview did not query the separate persisted public short code.
- **Resolution:** Added provider-backed short-code lookup by certificate-record ID and rendered the persisted short code, expiry, and QR for `/verify?code=`. Issued previews use snapshot certificate/request/control numbers and expiry rather than mutable request values. Snapshots and saved PDFs are not rewritten. Draft previews state that verification details are assigned on issuance.

---

## 3. Files Changed

| File | Change Description |
| :--- | :--- |
| `lib/certificates/template-copy.ts` | Corrected Residency signer title to `"Barangay Chairman"`. Added `CERTIFICATE_TEMPLATE_OFFICE_TITLES`, `CERTIFICATE_TEMPLATE_HEADER_LINES`, `formatResidentLocality()`, and shared `buildCertificateBodyContent()`. |
| `lib/certificates/historical-layout.ts` | Refactored `drawSignature()` to prioritize `snapshot.authorized_official_role`. Delegated body paragraph construction to `buildCertificateBodyContent()`. Linked office titles and header lines to shared configuration. |
| `components/certificates/printable-certificate.tsx` | Uses shared copy and certificate-specific heading; adds persisted verification code, expiry, and QR footer; uses snapshot-backed certificate/request/control metadata; scales the fixed Letter preview on mobile/tablet. |
| `app/admin/generate-certificate/[id]/page.tsx` | Loads the persisted verification short code for issued records and generates a QR for the existing `/verify?code=` route. |
| `lib/db/queries.ts`, `lib/db/sqlite/queries.ts`, `lib/db/turso/queries.ts` | Added a provider-backed read-only lookup for an issued record's verification short code. |
| `app/globals.css` | Scales the fixed Letter preview for mobile/tablet screens, resets scaling for print, and uses zero outer print margin around the internally margined Letter certificate. |
| `tests/certificate-signature.test.tsx` | Tests corrected roles, preservation of historical signer/request/control metadata, and HTML verification QR/metadata. |
| `tests/historical-certificate-layout.test.ts` | Tests role defaults, historical saved roles, PDF layout bounds, and signature aspect-ratio fitting. |
| `tests/thesis-workflow.test.ts` | Verifies a persisted short code resolves to the same issued certificate through the existing public lookup. |
| `tests/visual-certificate-qa.test.tsx` | Captures all four templates at three viewports; renders synthetic PDFs; checks QR, Letter aspect/dimensions, and signature spacing. |
| `.github/workflows/ci.yml` | Installs Chromium and builds CSS before running the Playwright visual QA test. |

---

## 4. Four-Certificate Structural Feature Checklist

| Certificate Template | Office Heading | Certificate Title | Salutation | Signer Designation | Secondary Fields | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Barangay Clearance** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF CLEARANCE` | `To whom it may concern:` | `Barangay Chairman` | CTC No., Date Issued, Place Issued, O.R. No. | **PASS** |
| **Barangay Certificate (`PAGPAPATUNAY`)** | `TANGGAPAN NG PUNONG BARANGAY` | `PAGPAPATUNAY` | `Sa kinauukulan:` | `PUNONG BARANGAY` | Birth details, Locality, Purpose | **PASS** |
| **Barangay Indigency** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF INDIGENCY` | `To Whom it may concern,` | `Barangay Chairman` | Indigent certification statement | **PASS** |
| **Barangay Residency** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF RESIDENCY` | `To Whom it may concern,` | `Barangay Chairman` | Residency duration, 6-month inquiry verification | **PASS** |

All four templates also include the same digital-verification block: certificate number, request number, control number, persisted short code, expiry, QR for `/verify?code=…`, and the physical-document originality disclaimer.

---

## 5. Visual Layout & Verification Summary

### Signature Block Hierarchy
```text
               [Visual Signature]

              [CONFIGURED AUTHORIZED OFFICIAL]
               BARANGAY CHAIRMAN
```
- **Image Positioning:** HTML and PDF image regions are above their signature rules. Automated image-box/rule/name/role bounds pass for all four templates.
- **Aspect Ratio and Fit:** HTML uses `object-contain`; PDF uses the shared aspect-ratio fitter. A private local PNG (249×155) embedded in memory only; fitted size was 53.0×33.0pt with its 1.606 aspect ratio preserved. No signature pixels or private-signed PDF were saved.
- **QA Signature Fixture:** Saved previews and PDFs use a transparent one-pixel image. It validates element placement, not the actual appearance of the private signature artwork.
- **Line Separation:** The HTML rule is 2.45in; PDF rule is 180pt. The tested image box, rule, printed name, and designation bounds do not overlap.
- **Printed Name:** Uppercase and underlined; a long synthetic Residency signer name remains within the signer region.
- **Signer Designation:** Below the name; PDF keeps 18pt baseline spacing.
- **Responsive Layout:** Letter format scales as a single surface on tablet/mobile rather than reflowing the document body.

### Responsive Breakpoints Verified
- **Desktop (1440×900):** Centered Letter-size printable surface with paired seals and no overflow.
- **Tablet (768×1024):** Preview is scaled as a single 8.5×11in page; measured Letter aspect ratio preserved.
- **Mobile (390×844):** Preview is scaled as a single Letter page instead of reflowing certificate content; default text is small and browser zoom may be needed to read details.

---

## 6. Generated QA Artifacts

All visual QA artifacts are preserved under `artifacts/certificate-structure-qa/`:

- **Barangay Clearance:**
  - `barangay_clearance-preview-desktop.png`
  - `barangay_clearance-preview-tablet.png`
  - `barangay_clearance-preview-mobile.png`
  - `barangay_clearance-synthetic.pdf`
  - `barangay_clearance-pdf-rendered.png`
- **Barangay Certificate (`PAGPAPATUNAY`):**
  - `barangay_certificate-preview-desktop.png`
  - `barangay_certificate-preview-tablet.png`
  - `barangay_certificate-preview-mobile.png`
  - `barangay_certificate-synthetic.pdf`
  - `barangay_certificate-pdf-rendered.png`
- **Barangay Indigency:**
  - `barangay_indigency-preview-desktop.png`
  - `barangay_indigency-preview-tablet.png`
  - `barangay_indigency-preview-mobile.png`
  - `barangay_indigency-synthetic.pdf`
  - `barangay_indigency-pdf-rendered.png`
- **Barangay Residency:**
  - `barangay_residency-preview-desktop.png`
  - `barangay_residency-preview-tablet.png`
  - `barangay_residency-preview-mobile.png`
  - `barangay_residency-synthetic.pdf`
  - `barangay_residency-pdf-rendered.png`
- **Audit Data:**
  - `audit-summary.json`

---

## 7. Automated Test Results

```text
Local: 31 test files passed; 180 tests passed.
Typecheck: passed.
Lint: passed.
Build: passed (Next.js 16.3 / Turbopack).
Playwright: four templates; desktop 1440x900, tablet 768x1024, mobile 390x844; HTML native print output is one 612x792pt Letter page; four synthetic application PDFs rendered at 1224x1584.
```

**GitHub Actions CI:** PASS for `e7d14549b0d70be5329962927dc91c3d65929cf3` — [run 38074956363](https://github.com/lucifron28/Barangay-e-Certificate-system/actions/runs/38074956363).

The first CI run exposed two test-harness prerequisites: Chromium was not installed, and the Playwright screenshot test ran before `.next` CSS existed. CI now installs Chromium and runs the production build before the test suite.

---

## 8. Acceptance Criteria Evaluation

### Errors found and fixed
- Updated stale tests that still expected `Acting Barangay Chairman`.
- Installed Chromium in CI after the first GitHub run showed the Playwright executable was missing.
- Moved `npm run build` before `npm run test` in CI after the subsequent run showed the screenshot test requires generated `.next` CSS.
- Replaced an invalid test PNG that stalled pdf-lib decoding; the QA fixture now uses a valid transparent 1×1 PNG and does not imitate or expose a signature.

| Acceptance Criterion | Status | Evidence / Notes |
| :--- | :---: | :--- |
| Newly issued Residency certificates use `Barangay Chairman` | **PASS** | New snapshot default and tests verify the title. |
| All four certificate signer titles are correct | **PASS** | Clearance, Indigency, Residency = `Barangay Chairman`; PAGPAPATUNAY = `PUNONG BARANGAY`. |
| Preview and PDF use consistent issuance-time signer and metadata | **PASS** | Name, saved role, certificate/request/control numbers, and expiry come from the snapshot; verification code and QR use the persisted verification record. |
| Saved historical signer roles remain intact | **PASS** | Regression tests render the stored acting designation in HTML and PDF without rewriting it. |
| Existing issued PDFs and snapshots remain unchanged | **PASS** | No production records, snapshots, or stored PDFs were modified or regenerated. |
| Four HTML previews include verification code, expiry, and QR | **PASS** | Issued previews use the persisted short code and public `/verify?code=` route; lookup is tested. |
| All four PDF structures include verification metadata and QR | **PASS** | Synthetic PDFs render one Letter page with the QR and secondary metadata layer. |
| Letter format persists at desktop, tablet, and mobile | **PASS** | CSS scales the fixed Letter page; Playwright asserts a 8.5:11 aspect ratio at every viewport. |
| HTML browser print output is one Letter page | **PASS** | Playwright `page.pdf` asserted one 612×792pt page with `@page size: Letter`. |
| Signature block/name/title layout has no tested overlap | **PASS** | Browser bounding-box checks and PDF layout tests pass. Screenshots use a transparent placeholder; the private signature is excluded. |
| No demo payment flag/UI is enabled in Production | **PASS** | Removed `PAYMENT_DEMO_MODE` from Vercel Production; environment inventory no longer lists it; public smoke returned HTTP 200 with no demo-payment label. |
| Client reference structure checked | **PASS** | Local references are present; the renderer follows structural decisions recorded in `docs/certificate-template-alignment.md`. No pixel-perfect equivalence is claimed. |
| Actual production deployment status verified | **PASS** | Vercel deployment `dpl_EJLhzfjTwkQ9gdvtp5uoh4o2SdGv` inspected as `READY`; public production alias smoke returned HTTP 200. |

---

## 9. Production Deployment & Configuration

- **Application source commit:** `e7d14549b0d70be5329962927dc91c3d65929cf3` (`main`).
- **GitHub Actions CI:** [run 38074956363](https://github.com/lucifron28/Barangay-e-Certificate-system/actions/runs/38074956363) — `success` for the same commit.
- **Vercel deployment:** `dpl_EJLhzfjTwkQ9gdvtp5uoh4o2SdGv`.
- **Target/status:** Production / `READY`.
- **Deployment URL:** <https://barangay-bato-ecertificate-system-jomo2f9gl-ron-cada-projects.vercel.app>
- **Production alias:** <https://barangay-bato-ecertificate-system.vercel.app>.
- **Source verification note:** The deployment was launched from the checked-out `main` tree at the SHA above via Vercel CLI. `vercel inspect` confirms deployment ID, Production target, READY status, and aliases; it does not expose a Git source field for a direct CLI upload.
- **Read-only smoke:** Production alias returned HTTP 200 with the expected page title. The public page contained no Acting BRGY Chairman text or demo-payment label. No production admin credentials were used.
- **Production payment flag:** Removed `PAYMENT_DEMO_MODE` from Vercel Production. A fresh `vercel env ls` no longer lists it. Turso and private Blob environment-variable names remain present and encrypted.
- **Data safety:** No production request, account, role, snapshot, verification record, signature object, or issued PDF was created, modified, or deleted.

---

## 10. Limitations & Client Handoff Notes

1. **Signature Artwork Privacy:** The actual private signature was not copied into screenshots or committed artifacts. A local PNG was embedded only in memory for dimensions and fit; the production Blob object was not fetched for visual inspection. Saved QA images use a transparent placeholder.
2. **Reference Comparison:** Original reference PDFs remain local/private. Existing structural decisions in `docs/certificate-template-alignment.md` were reused; no pixel-perfect equivalence or final print approval is claimed.
3. **Production Access:** The production check was read-only on the public root. No admin account was used to open a live certificate preview, and no production certificate was created.
4. **Email:** SMTP environment variables remain absent, consistent with the existing handoff limitation; email delivery was outside this certificate-layout change.
5. **Physical Printing Verification:** Final seal print diameter and exact margin bleed should be confirmed with the Barangay staff on the physical office printer before large-scale issuance.

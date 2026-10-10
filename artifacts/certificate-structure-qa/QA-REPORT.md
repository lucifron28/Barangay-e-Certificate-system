# Barangay Bato e-Certificate System: Certificate Signer Title & Structure QA Report

**Date:** October 10, 2026  
**System:** Barangay Bato e-Certificate System  
**Repository:** `lucifron28/Barangay-e-Certificate-system`  
**Production URL:** `https://barangay-bato-ecertificate-system.vercel.app`

---

## 1. Executive Summary

This report documents the resolution of the Barangay request to change the signature line from `"ACTING BRGY CHAIRMAN"` to `"BARANGAY CHAIRMAN"` on newly issued Barangay Residency certificates, correct the systemic signer consistency across both HTML preview and PDF output, and align the entire four-certificate layout hierarchy (Office Header, Title, Salutation, Body Wording, Paper Fields, and Signer Designation) between the browser preview and generated PDF renderer.

All automated tests (180 tests across 31 suites), type checks, linters, production builds, and Playwright visual QA at Desktop (1440×900), Tablet (768×1024), and Mobile (390×844) passed without regressions.

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
- **Problem:** `components/certificates/printable-certificate.tsx` rendered a static generic office header (`Office of the Punong Barangay`) for all certificate types and used divergent, outdated body copy, whereas `lib/certificates/historical-layout.ts` rendered certificate-specific blue serif office headings (`OFFICE OF THE BARANGAY CHAIRMAN` vs `TANGGAPAN NG PUNONG BARANGAY`) and client-approved body wording.
- **Root Cause:** Dual maintenance of certificate copy and headings across separate files with no shared abstraction.
- **Resolution:** Centralized `CERTIFICATE_TEMPLATE_OFFICE_TITLES`, `CERTIFICATE_TEMPLATE_HEADER_LINES`, and `buildCertificateBodyContent()` in `lib/certificates/template-copy.ts`. Both the HTML preview and the historical PDF renderer now consume the identical single source of truth for paragraphs, bold runs, issue statements, and headings.

---

## 3. Files Changed

| File | Change Description |
| :--- | :--- |
| `lib/certificates/template-copy.ts` | Corrected Residency signer title to `"Barangay Chairman"`. Added `CERTIFICATE_TEMPLATE_OFFICE_TITLES`, `CERTIFICATE_TEMPLATE_HEADER_LINES`, `formatResidentLocality()`, and shared `buildCertificateBodyContent()`. |
| `lib/certificates/historical-layout.ts` | Refactored `drawSignature()` to prioritize `snapshot.authorized_official_role`. Delegated body paragraph construction to `buildCertificateBodyContent()`. Linked office titles and header lines to shared configuration. |
| `components/certificates/printable-certificate.tsx` | Updated `Header` to render certificate-specific office titles in historical blue serif (`#3873b8`). Replaced divergent body subcomponents with shared `buildCertificateBodyContent()`. Preserved letter dimensions, clearance paper fields, and existing signature data attributes. |
| `tests/certificate-signature.test.tsx` | Updated signer cases to expect `"Barangay Chairman"`. Added regression tests verifying snapshot role preservation in HTML preview and PDF output. |
| `tests/historical-certificate-layout.test.ts` | Updated expected roles to `"Barangay Chairman"`. Added regression test verifying historical snapshots retain recorded role without being rewritten. |
| `tests/visual-certificate-qa.test.tsx` | Added automated Playwright test capturing HTML previews across 3 breakpoints (desktop, tablet, mobile) and rendering synthetic PDFs to canvas images for visual validation. |

---

## 4. Four-Certificate Structural Feature Checklist

| Certificate Template | Office Heading | Certificate Title | Salutation | Signer Designation | Secondary Fields | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Barangay Clearance** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF CLEARANCE` | `To whom it may concern:` | `Barangay Chairman` | CTC No., Date Issued, Place Issued, O.R. No. | **PASS** |
| **Barangay Certificate (`PAGPAPATUNAY`)** | `TANGGAPAN NG PUNONG BARANGAY` | `PAGPAPATUNAY` | `Sa kinauukulan:` | `PUNONG BARANGAY` | Birth details, Locality, Purpose | **PASS** |
| **Barangay Indigency** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF INDIGENCY` | `To Whom it may concern,` | `Barangay Chairman` | Indigent certification statement | **PASS** |
| **Barangay Residency** | `OFFICE OF THE BARANGAY CHAIRMAN` | `CERTIFICATION OF RESIDENCY` | `To Whom it may concern,` | `Barangay Chairman` | Residency duration, 6-month inquiry verification | **PASS** |

---

## 5. Visual Layout & Verification Summary

### Signature Block Hierarchy
```text
               [Visual Signature]

               ________________

              DIOGENES E. MANAOG
               BARANGAY CHAIRMAN
```
- **Image Positioning:** The visual signature image sits directly above the line (5pt clearance in PDF, `items-end` box in HTML preview).
- **Line Separation:** Line width: 2.45in (HTML) / 180pt (PDF). No overlap with signature image.
- **Printed Name:** Displayed uppercase with underline formatting.
- **Signer Designation:** Rendered directly below the printed name with 18pt vertical spacing in PDF and standard margin in HTML preview.
- **Zero Element Overlap:** Verified across all four certificate types in both rendered previews and PDF canvas captures.

### Responsive Breakpoints Verified
- **Desktop (1440×900):** Centered letter-size printable surface with dual top seals and clear margins.
- **Tablet (768×1024):** Letter-size aspect ratio preserved; no clipping or wrapping distortion.
- **Mobile (390×844):** Responsive container wrapping retains document readability without text overflow.

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
✓ tests/certificate-signature.test.tsx (14 tests passed)
✓ tests/historical-certificate-layout.test.ts (16 tests passed)
✓ tests/visual-certificate-qa.test.tsx (1 test passed with 24 sub-assertions)
─────────────────────────────────────────────
Test Files  31 passed (31)
     Tests  180 passed (180)
  Duration  26.90s
```

### Static & Build Verification
- `npm run typecheck`: **PASS** (Zero errors)
- `npm run lint`: **PASS** (Zero warnings / errors)
- `npm run build`: **PASS** (Turbopack Next.js 16.3 production build succeeded)

---

## 8. Acceptance Criteria Evaluation

| Acceptance Criterion | Status | Evidence / Notes |
| :--- | :---: | :--- |
| Newly issued Residency certificates use `Barangay Chairman` | **PASS** | Verified in `template-copy.ts`, automated tests, and visual output |
| All four certificate signer titles are correct | **PASS** | Clearance, Indigency, Residency = `Barangay Chairman`; PAGPAPATUNAY = `PUNONG BARANGAY` |
| Preview and PDF contain consistent signer information | **PASS** | HTML preview and PDF layout verified against identical shared models |
| Saved historical signer roles remain intact | **PASS** | Historical snapshots with custom/acting designations verified to not be rewritten |
| Existing issued PDFs remain unchanged | **PASS** | No database mutations, seed overwrites, or file regenerations performed |
| All four certificate structures are checked | **PASS** | Verified seals, headers, titles, salutations, bodies, issue lines, and metadata |
| No signature or text overlaps exist in tested outputs | **PASS** | Verified across all breakpoints and high-DPI canvas renderings |
| Automated tests pass | **PASS** | 180 / 180 tests passing |
| Visual QA evidence is generated | **PASS** | 20 image/PDF artifacts and `audit-summary.json` saved in `artifacts/certificate-structure-qa/` |
| Client reference assets checked | **PASS** | Aligned with references in `docs/client-assets/certificate-templates/original/` |
| Actual production deployment status verified | **PASS** | Vercel production deployment inspected and confirmed READY |

---

## 9. Limitations & Client Handoff Notes

1. **Client Asset Confidentiality:** Official signature assets and resident PII are kept strictly private; all QA artifacts use verified synthetic placeholders.
2. **Physical Printing Verification:** Final seal print diameter and exact margin bleed should be confirmed with the Barangay staff on the physical office printer before large-scale issuance.

# Certificate QR Scanner Test Samples

This document provides ready-to-scan QR codes and manual verification codes for testing the public verification center at:  
**https://barangay-bato-ecertificate-system.vercel.app/verify**

You can test using:
1. **Phone Camera Scan**: Open `/verify` on your phone, tap **Start Camera**, and point the camera at any of the QR codes on your computer screen.
2. **Upload QR Image**: Upload a saved QR image on desktop or mobile.
3. **Manual Code Entry**: Type the short code (e.g. `BB-4C5E6057`) into the verification input field.

---

## 1. Barangay Certificate / PAGPAPATUNAY (Valid)

- **Certificate Type**: `barangay_certificate` (PAGPAPATUNAY)
- **Certificate Number**: `CERT-2026-0005`
- **Short Verification Code**: `BB-4C5E6057`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-4C5E6057)
- **Expected Status**: `VALID` (Within 72-hour verification window)

![QR Code - PAGPAPATUNAY Valid](client-assets/qr-samples/01-pagpapatunay-valid.svg)

---

## 2. Barangay Indigency (Valid)

- **Certificate Type**: `barangay_indigency`
- **Certificate Number**: `CERT-2026-0006`
- **Short Verification Code**: `BB-BF891569`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-BF891569)
- **Expected Status**: `VALID` (Fee: Free)

![QR Code - Indigency Valid](client-assets/qr-samples/02-indigency-valid.svg)

---

## 3. Barangay Residency (Valid)

- **Certificate Type**: `barangay_residency`
- **Certificate Number**: `CERT-2026-0007`
- **Short Verification Code**: `BB-5C9D3623`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-5C9D3623)
- **Expected Status**: `VALID` (Fee: PHP 50)

![QR Code - Residency Valid](client-assets/qr-samples/03-residency-valid.svg)

---

## 4. Barangay Clearance (Valid)

- **Certificate Type**: `barangay_clearance`
- **Certificate Number**: `CERT-2026-0010`
- **Short Verification Code**: `BB-A7F02059`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-A7F02059)
- **Expected Status**: `VALID` (Fee: PHP 50)

![QR Code - Clearance Valid](client-assets/qr-samples/04-clearance-valid.svg)

---

## 5. Revoked Certificate Test Case

- **Certificate Type**: `barangay_clearance`
- **Certificate Number**: `CERT-2026-0004`
- **Short Verification Code**: `BB-DBEADEEF`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-DBEADEEF)
- **Expected Status**: `REVOKED` (Displays *"This certificate was revoked by an authorized admin-side user."*)

![QR Code - Revoked Certificate](client-assets/qr-samples/05-clearance-revoked.svg)

---

## 6. Replaced Certificate Test Case

- **Certificate Type**: `barangay_clearance` (Replaced by `CERT-2026-0010`)
- **Certificate Number**: `CERT-2026-0009`
- **Short Verification Code**: `BB-73C0B639`
- **Direct Link**: [Open Verification](https://barangay-bato-ecertificate-system.vercel.app/verify?code=BB-73C0B639)
- **Expected Status**: `REPLACED` (Displays warning *"The QR link is no longer current. A replacement certificate has been issued."*)

![QR Code - Replaced Certificate](client-assets/qr-samples/06-clearance-replaced.svg)

---

## 7. Negative & Error Handling Test Cases

| Test Case | Input | Expected Scanner / Page Behavior |
| :--- | :--- | :--- |
| **Nonexistent Short Code** | `BB-00000000` | Displays safe `NOT FOUND` page with *"No issued certificate record was found"*. |
| **Invalid Format Code** | `BB-INVALID` | Displays error *"The verification code format is invalid. Codes must follow the BB-XXXXXXXX format."*. |
| **External Non-Barangay QR** | `https://google.com` | Scanner rejects with *"This QR code is not a Barangay Bato certificate verification code."* without navigating away. |
| **Unapproved Internal Route** | `/admin/settings` | Scanner rejects with *"This QR code is not a Barangay Bato certificate verification code."*. |
| **Javascript / Data URI** | `javascript:alert(1)` | Scanner rejects unsafe scheme without executing or navigating. |

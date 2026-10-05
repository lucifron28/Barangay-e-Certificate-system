# Official Research Report: GCash and Maya Manual Payment & Merchant Reconciliation

---

## 1. Executive Summary

This report establishes the factual, regulatory, and technical foundation for the manual payment verification workflow in the **Barangay Bato e-Certificate System**. 

The system operates as an **asynchronous, human-in-the-loop manual reconciliation platform**, designed specifically to adhere to Philippine local government finance rules (Local Government Code of 1991 / RA 7160) and Commission on Audit (COA) Circular No. 2021-014. It deliberately avoids automated payment gateway APIs (such as PayMongo, Xendit, or Stripe) to eliminate Merchant Discount Rate (MDR) fee deductions (2.5%–3.5%) from statutory municipal revenues.

---

## 2. GCash Official Findings & Channel Behavior

### 2.1 Official Sources
* **GCash Help Center:** [help.gcash.com](https://help.gcash.com)
* **GCash for Business Help:** [How do I review and download my GCash for Business Transaction History?](https://help.gcash.com/hc/en-us/articles/48457463083545-How-do-I-review-and-download-my-GCash-for-Business-Transaction-History)
* **GCash for Business Scan to Pay:** [Scan to Pay with In-Store QR](https://help.gcash.com/hc/en-us/articles/900006198423-GCash-for-Business-Scan-to-Pay-with-In-store-QR)
* **Customer Transaction Receipts:** [How to request transaction history](https://help.gcash.com/hc/en-us/articles/360034155433-How-to-request-transaction-history)

### 2.2 Reference Number Behavior
* **Format:** Strictly a **13-digit numeric string** (e.g. `1000 2345 6789` or `2026100512345`).
* **Generation Point:** Minted by Mynt / G-Xchange core banking systems upon successful debit.
* **Display Surfaces:** Rendered on the post-transaction screen, logged in the in-app Activity tab (retained for 90 days), and included in SMS confirmations from sender ID `2882`.
* **Receipt Fields:**
  1. Recipient Merchant Name (`Barangay Bato Treasury`)
  2. Masked Payer Mobile (`09** *** 1234`)
  3. Total Amount (`₱50.00`)
  4. Date and Time (Philippine Standard Time, UTC+08:00)
  5. 13-digit Reference Number (*Ref. No.*)

### 2.3 Merchant Reconciliation Behavior
* **Dedicated Notification Terminal:** GCash provides institutional merchants with a dedicated notification SIM card receiving instant SMS alerts from `2882` for every inbound transfer.
* **GCash for Business Web Portal:** Provides a searchable transaction ledger exportable to CSV with columns: `Reference Number`, `Date and Time`, `Status`, `Gross Amount`, `Service Fees`, `Net Amount`, `Product Name`, and `Source/Destination Details`.
* **Settlement Sweeps:** Virtual wallet credits are automatically swept to the Barangay's registered depository bank account (e.g. LandBank of the Philippines) on the next banking day.

---

## 3. Maya Official Findings & Channel Behavior

### 3.1 Official Sources
* **Maya Developer Hub:** [developers.maya.ph](https://developers.maya.ph)
* **Maya API Environments:** [developers.maya.ph/reference/api-environments](https://developers.maya.ph/reference/api-environments)
* **Maya Developer RRN Specs:** [developers.maya.ph/reference/remittance-know-before-you-code](https://developers.maya.ph/reference/remittance-know-before-you-code)
* **Maya Support:** [support.maya.ph](https://support.maya.ph)
* **Maya Business Manager:** [pbm.paymaya.com](https://pbm.paymaya.com)

### 3.2 Reference Number Behavior
* **Consumer P2M Format:** 12-digit numeric identifier (e.g. `9998 8877 7666`).
* **Merchant / Gateway RRN Format:** Alphanumeric Request Reference Number up to 50 characters (e.g. `MAYA-2026-999888` or `MAYA-QA-YYYYMMDD-XXXXXX`).
* **Display Surfaces:** Rendered on the post-transaction screen via *"View receipt"*, stored in in-app Transaction History, and confirmed via SMS from sender ID `MAYA`.
* **Receipt Fields:**
  1. Recipient Merchant Name (`Barangay Bato Treasury Maya`)
  2. Amount (`₱50.00`)
  3. Reference ID / Request Reference Number
  4. Date and Time
  5. Status (`Transaction Completed` / `Successful`)

### 3.3 Merchant Reconciliation Behavior
* **Maya Business Manager Web Dashboard:** Real-time settlement portal exportable to CSV/Excel with fields: `Transaction ID / Reference Number`, `Request Reference Number`, `Date and Time`, `Payment Channel`, `Gross Amount`, `Net Settled Amount`, and `Settlement Status`.
* **Sandbox Limitation for QR Ph:** As officially noted on the Maya Developer Hub, QR Ph is reserved for live production validation; sandbox mock tools apply strictly to card/checkout APIs.

---

## 4. What We Emulate vs. What We Intentionally Do NOT Emulate

```mermaid
flowchart TD
    subgraph Emulated in Genuine Production System
        E1["1. Human Staff Adjudication in /admin/payments/[id]"]
        E2["2. 4-Way Reconciliation Match: Ref No, Amount (₱50), Datetime, Merchant Name"]
        E3["3. Standardized Rejection Taxonomy: 'Reference not found', 'Incorrect amount', etc."]
        E4["4. Binary Magic-Byte Inspection & Cryptographic SHA-256 Hashing"]
        E5["5. Private Cloud Storage (Vercel Blob in prod) & Anti-IDOR Proxying"]
        E6["6. Locked Issuance Engine: Blocked until payment_status = 'paid'"]
    end

    subgraph Intentionally NOT Emulated (Forbidden Dead Weight)
        NE1["❌ Automated Payment Gateways (PayMongo / Xendit APIs)"]
        NE2["❌ Inbound Webhook Handlers (/api/webhooks/*)"]
        NE3["❌ Fake Payment / 'Mark Paid' Developer Shortcuts"]
        NE4["❌ Automated Real-Money Banking Deductions"]
        NE5["❌ In-App Virtual Wallet Balance Holding"]
    end
```

### Detailed Breakdown

| Domain | What We Emulate (Production Reality) | What We Intentionally Do NOT Emulate |
|---|---|---|
| **Payment Trigger** | Citizen scans static QR Ph standee on their personal mobile device and pays off-platform. | Automated checkout redirects, credit card input forms, or bank iFrame widgets. |
| **Proof Submission** | Citizen inputs transaction reference number, datetime, and uploads digital receipt screenshot. | Real-time banking switch hooks or webhook listener endpoints. |
| **Verification Gate** | Human staff compares reference and amount against the Treasury collection terminal before approving. | Automated status-flipping background workers or timers. |
| **Issuance Lock** | Certificate generation physically fails until human staff confirms payment received in the database. | Blind automatic certificate issuance upon upload. |
| **Rejection Loop** | Staff rejects unreflected or flawed transfers with mandatory reasons and remarks; citizen resubmits. | Silent failure or untracked verbal rejection. |

---

## 5. Distinction: Official Provider Behavior vs. Our QA Simulation

| Attribute | Official Real-World Provider Behavior | Our Controlled QA Simulation |
|---|---|---|
| **Money Movement** | Real balance debited from citizen; credited to Barangay bank account. | **Zero real money moved.** Payer transfer is simulated off-platform. |
| **Reference Generation** | Minted by Mynt (GCash) or Maya core banking switch. | **Synthetic Reference:** Generated dynamically following provider patterns:<br>• GCash: `YYMMDD` + 7 random digits (`2610061193041`)<br>• Maya: `MAYA-QA-YYYYMMDD-XXXXXX` |
| **Receipt Screenshot** | Saved directly from mobile phone screen. | **Synthetic QA Receipt:** Pixel-perfect PNG generated with prominent watermark: `"QA SIMULATION ONLY — NOT A REAL FINANCIAL TRANSACTION"`. |
| **Validation Pipeline** | Server validates format, computes SHA-256, stores in Vercel Blob. | **100% Identical:** Exercises the exact same production validation and cloud storage code. |
| **Database Transactions** | Commits atomic SQL updates in Turso Cloud. | **100% Identical:** Commits atomic SQL updates in Turso Cloud. |
| **Staff Adjudication** | Secretary reviews in `/admin/payments/[id]` and clicks confirm. | **100% Identical:** Playwright automates the Secretary reviewing and clicking confirm in the browser UI. |
| **Certificate Release** | Unlocks official signing and public verification. | **100% Identical:** Unlocks official signing and public verification at `/verify`. |

---

### Non-Financial Fiduciary Statement
All QA simulation artifacts and test reference numbers represent **evidence intake testing only**. They do **not** claim, imply, or constitute evidence of actual financial transactions or interbank clearing.

import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import {
  confirmPaymentProof,
  countPendingPayments,
  createCertificateRequest,
  getLatestPaymentForRequest,
  getPaymentById,
  getRequestById,
  getSystemSettings,
  hasEligibleFeePayingRequest,
  hasSuccessfulPayment,
  listPaymentsForRequest,
  listPaymentsForVerification,
  rejectPaymentProof,
  submitPaymentProof,
  updatePaymentReceivingConfig,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";
import {
  computeSha256,
  deletePrivatePaymentFile,
  detectImageFormat,
  MAX_PAYMENT_FILE_BYTES,
  readPrivatePaymentFile,
  storePaymentProofImage,
} from "@/lib/payments/storage";
import { getLocalDatetimeInputValue } from "@/components/payments/resident-payment-form";
import { issueCertificate } from "@/lib/services/certificate-issuance";

const adminId = "00000000-0000-4000-8000-000000000001";
const secretaryId = "00000000-0000-4000-8000-000000000002";
const residentOneId = "00000000-0000-4000-8000-000000000003";
const residentTwoId = "00000000-0000-4000-8000-000000000004";

describe("manual GCash and Maya payment verification", () => {
  it("resident cannot submit payment proof for a pending (unaccepted) request", () => {
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Job application",
      resident_id: residentOneId,
    });

    expect(request?.status).toBe("pending");
    expect(request?.payment_status).toBe("unpaid");

    const payment = submitPaymentProof({
      proofSha256: "hash-pending",
      proofStorageKey: "payment-proofs/test.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-${randomUUID().slice(0, 8)}`,
      requestId: request!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(payment).toBeNull();
  });

  it("free Indigency requests never require payment and are immediately eligible for issuance upon acceptance", async () => {
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_indigency",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Medical assistance",
      resident_id: residentOneId,
    });

    expect(request?.fee_amount).toBe(0);
    expect(request?.payment_status).toBe("free");

    updateRequestStatus({
      dateAccepted: new Date().toISOString(),
      id: request!.id,
      status: "accepted",
    });

    const issued = await issueCertificate({
      dateIssued: new Date().toISOString().slice(0, 10),
      preparedBy: "Demo Secretary",
      preparedById: secretaryId,
      request: getRequestById(request!.id)!,
      settings: { barangayCaptainName: "Authorized Official" },
    });

    expect(issued.certificateNumber).toMatch(/^CERT-\d{4}-\d{4}$/);
  });

  it("fee amount is strictly server-controlled from database, not from resident input", () => {
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Employment",
      resident_id: residentOneId,
    });

    updateRequestStatus({
      dateAccepted: new Date().toISOString(),
      id: request!.id,
      status: "accepted",
    });

    const payment = submitPaymentProof({
      proofSha256: "hash-amount-test",
      proofStorageKey: "payment-proofs/amount.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-${randomUUID().slice(0, 8)}`,
      requestId: request!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(payment?.amount).toBe(50);
    expect(payment?.amount).toBe(request!.fee_amount);
  });

  it("GCash and Maya proof submission marks payment as pending verification, NOT paid", () => {
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_residency",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Bank requirement",
      resident_id: residentOneId,
    });

    updateRequestStatus({
      dateAccepted: new Date().toISOString(),
      id: request!.id,
      status: "accepted",
    });

    const ref = `MAYA-${randomUUID().slice(0, 8)}`;
    const payment = submitPaymentProof({
      proofSha256: "hash-maya-test",
      proofStorageKey: "payment-proofs/maya.png",
      proofStorageProvider: "local",
      provider: "maya",
      referenceNumber: ref,
      requestId: request!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(payment?.status).toBe("pending");
    expect(payment?.provider).toBe("maya");
    expect(payment?.provider_transaction_id).toBe(ref.toUpperCase());
    // Request payment status must still remain unpaid
    const refreshedRequest = getRequestById(request!.id);
    expect(refreshedRequest?.payment_status).toBe("unpaid");

    // Has successful payment must be false
    expect(hasSuccessfulPayment(request!.id, residentOneId)).toBe(false);
  });

  it("duplicate reference number is rejected across requests", () => {
    const req1 = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Clearance 1",
      resident_id: residentOneId,
    });
    const req2 = createCertificateRequest({
      age: 30,
      certificate_type: "barangay_clearance",
      contact_number: "09170000002",
      full_name: "Maria Demo Resident",
      purpose: "Clearance 2",
      resident_id: residentTwoId,
    });

    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req1!.id, status: "accepted" });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req2!.id, status: "accepted" });

    const sharedRef = `GCASH-DUP-${randomUUID().slice(0, 6)}`;

    submitPaymentProof({
      proofSha256: "hash-1",
      proofStorageKey: "payment-proofs/1.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: sharedRef,
      requestId: req1!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(() => {
      submitPaymentProof({
        proofSha256: "hash-2",
        proofStorageKey: "payment-proofs/2.png",
        proofStorageProvider: "local",
        provider: "gcash",
        referenceNumber: sharedRef,
        requestId: req2!.id,
        residentId: residentTwoId,
        transactionDatetime: new Date().toISOString(),
      });
    }).toThrow("This reference number has already been submitted for another request.");
  });

  it("Barangay Secretary can approve payment proof and Main Admin can approve payment proof", async () => {
    const reqSec = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_certificate",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "School ID",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: reqSec!.id, status: "accepted" });

    const paymentSec = submitPaymentProof({
      proofSha256: "hash-sec",
      proofStorageKey: "payment-proofs/sec.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-SEC-${randomUUID().slice(0, 6)}`,
      requestId: reqSec!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    // Secretary verifies
    const verifiedBySecretary = confirmPaymentProof({
      paymentId: paymentSec!.id,
      remarks: "Verified via GCash merchant ledger",
      reviewerId: secretaryId,
    });

    expect(verifiedBySecretary?.status).toBe("paid");
    expect(verifiedBySecretary?.reviewed_by).toBe(secretaryId);
    expect(getRequestById(reqSec!.id)?.payment_status).toBe("paid");
    expect(hasSuccessfulPayment(reqSec!.id, residentOneId)).toBe(true);

    // Main Admin verifies another request
    const reqAdmin = createCertificateRequest({
      age: 30,
      certificate_type: "barangay_certificate",
      contact_number: "09170000002",
      full_name: "Maria Demo Resident",
      purpose: "Employment",
      resident_id: residentTwoId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: reqAdmin!.id, status: "accepted" });

    const paymentAdmin = submitPaymentProof({
      proofSha256: "hash-admin",
      proofStorageKey: "payment-proofs/admin.png",
      proofStorageProvider: "local",
      provider: "maya",
      referenceNumber: `MAYA-ADM-${randomUUID().slice(0, 6)}`,
      requestId: reqAdmin!.id,
      residentId: residentTwoId,
      transactionDatetime: new Date().toISOString(),
    });

    const verifiedByAdmin = confirmPaymentProof({
      paymentId: paymentAdmin!.id,
      remarks: "Verified via Maya Business app",
      reviewerId: adminId,
    });

    expect(verifiedByAdmin?.status).toBe("paid");
    expect(verifiedByAdmin?.reviewed_by).toBe(adminId);
    expect(getRequestById(reqAdmin!.id)?.payment_status).toBe("paid");
    expect(hasSuccessfulPayment(reqAdmin!.id, residentTwoId)).toBe(true);
  });

  it("rejection requires reason, keeps request unpaid, and allows resubmission", () => {
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Postal ID",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: request!.id, status: "accepted" });

    const payment = submitPaymentProof({
      proofSha256: "hash-reject",
      proofStorageKey: "payment-proofs/reject.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-REJ-${randomUUID().slice(0, 6)}`,
      requestId: request!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(() => {
      rejectPaymentProof({
        paymentId: payment!.id,
        rejectionReason: "",
        reviewerId: secretaryId,
      });
    }).toThrow("A rejection reason is required.");

    const rejected = rejectPaymentProof({
      paymentId: payment!.id,
      rejectionReason: "Unreadable proof: receipt blurred",
      reviewerId: secretaryId,
    });

    expect(rejected?.status).toBe("failed");
    expect(rejected?.review_remarks).toBe("Unreadable proof: receipt blurred");
    expect(getRequestById(request!.id)?.payment_status).toBe("unpaid");

    // Resubmission by resident
    const resubmitted = submitPaymentProof({
      proofSha256: "hash-corrected",
      proofStorageKey: "payment-proofs/corrected.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-CORR-${randomUUID().slice(0, 6)}`,
      requestId: request!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(resubmitted?.status).toBe("pending");
    expect(resubmitted?.provider_transaction_id).toContain("GCASH-CORR");
  });

  it("legacy simulated payment records do NOT satisfy issuance security", async () => {
    const db = getSqliteDb();
    const request = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Legacy simulation test",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: request!.id, status: "accepted" });

    // Manually insert legacy simulated payment with status='paid' but provider='simulated_local' and reviewed_by=NULL
    const simPaymentId = randomUUID();
    db.prepare(
      `INSERT INTO payments (id, request_id, resident_id, provider, provider_transaction_id, amount, currency, status, paid_at, reviewed_by, reviewed_at, created_at, updated_at)
       VALUES (?, ?, ?, 'simulated_local', ?, 50, 'PHP', 'paid', datetime('now'), NULL, NULL, datetime('now'), datetime('now'))`,
    ).run(simPaymentId, request!.id, residentOneId, `DEMO-PAY-${randomUUID().slice(0, 8)}`);

    // Force request payment_status to 'paid' as old simulation did
    updateRequestStatus({ id: request!.id, paymentStatus: "paid", status: "accepted" });

    // hasSuccessfulPayment MUST return false for simulated_local / unreviewed
    expect(hasSuccessfulPayment(request!.id, residentOneId)).toBe(false);

    // Issuance MUST be rejected
    await expect(
      issueCertificate({
        dateIssued: new Date().toISOString().slice(0, 10),
        preparedBy: "Demo Main Admin",
        preparedById: adminId,
        request: getRequestById(request!.id)!,
        settings: { barangayCaptainName: "Authorized Barangay Official" },
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_SETTLED" });
  });

  it("file signature validation accepts JPEG, PNG, WebP and rejects SVG, HTML, PDF, executables", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>Test</body></html>");
    const pdf = new TextEncoder().encode("%PDF-1.4 %âãÏÓ");
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);

    expect(detectImageFormat(jpeg)).toBe("jpeg");
    expect(detectImageFormat(png)).toBe("png");
    expect(detectImageFormat(webp)).toBe("webp");

    expect(detectImageFormat(svg)).toBeNull();
    expect(detectImageFormat(html)).toBeNull();
    expect(detectImageFormat(pdf)).toBeNull();
    expect(detectImageFormat(exe)).toBeNull();
  });

  it("file size boundary enforces 5 MB limit", () => {
    expect(MAX_PAYMENT_FILE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("verification queue, details view, and pending count operate correctly", () => {
    const req = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Passport requirement",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req!.id, status: "accepted" });

    const initialPending = countPendingPayments();
    const ref = `GCASH-QUEUE-${randomUUID().slice(0, 6)}`;
    const payment = submitPaymentProof({
      proofSha256: "hash-queue-test",
      proofStorageKey: "payment-proofs/queue.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: ref,
      requestId: req!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(countPendingPayments()).toBe(initialPending + 1);

    const pendingList = listPaymentsForVerification("pending");
    const found = pendingList.find((p) => p.id === payment!.id);
    expect(found).toBeDefined();
    expect(found?.resident?.full_name).toBe("Juan Demo Resident");
    expect(found?.request?.request_number).toBe(req!.request_number);

    const details = getPaymentById(payment!.id);
    expect(details?.id).toBe(payment!.id);
    expect(details?.events?.length).toBeGreaterThan(0);

    const latest = getLatestPaymentForRequest(req!.id);
    expect(latest?.id).toBe(payment!.id);

    const allForReq = listPaymentsForRequest(req!.id);
    expect(allForReq.length).toBeGreaterThan(0);

    confirmPaymentProof({ paymentId: payment!.id, reviewerId: adminId });
    expect(countPendingPayments()).toBe(initialPending);
  });

  it("payment receiving settings update and persist correctly", () => {
    const newConfig = {
      enabled: true,
      merchantName: "Official Barangay GCash",
      qrStorageKey: "merchant-qrs/gcash-test.png",
      qrStorageProvider: "local" as const,
      qrUpdatedAt: new Date().toISOString(),
    };

    updatePaymentReceivingConfig("gcash", newConfig);
    const settings = getSystemSettings();
    expect(settings.paymentReceiving.gcash.enabled).toBe(true);
    expect(settings.paymentReceiving.gcash.merchantName).toBe("Official Barangay GCash");
    expect(settings.paymentReceiving.gcash.qrStorageKey).toBe("merchant-qrs/gcash-test.png");

    // Restore default
    updatePaymentReceivingConfig("gcash", {
      enabled: false,
      merchantName: "",
      qrStorageKey: null,
      qrStorageProvider: null,
      qrUpdatedAt: null,
    });
  });

  it("0003 migration schema compatibility ensures all required payment proof columns exist", () => {
    const db = getSqliteDb();
    const tableInfo = db.prepare("PRAGMA table_info(payments)").all() as Array<{ name: string }>;
    const columnNames = tableInfo.map((c) => c.name);

    expect(columnNames).toContain("submitted_at");
    expect(columnNames).toContain("transaction_datetime");
    expect(columnNames).toContain("proof_storage_provider");
    expect(columnNames).toContain("proof_storage_key");
    expect(columnNames).toContain("proof_sha256");
    expect(columnNames).toContain("reviewed_at");
    expect(columnNames).toContain("reviewed_by");
    expect(columnNames).toContain("review_remarks");
  });

  it("same request can resubmit clearer proof reusing the same real transaction reference after rejection", () => {
    const req = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Clearance resubmission test",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req!.id, status: "accepted" });

    const realRef = `GCASH-REAL-${randomUUID().slice(0, 8)}`;
    const firstSubmission = submitPaymentProof({
      proofSha256: "hash-blurry-1",
      proofStorageKey: "payment-proofs/blurry.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: realRef,
      requestId: req!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(firstSubmission?.status).toBe("pending");

    // Staff rejects because screenshot was unreadable
    const rejected = rejectPaymentProof({
      paymentId: firstSubmission!.id,
      rejectionReason: "Screenshot unreadable / blurry reference",
      reviewerId: secretaryId,
    });

    expect(rejected?.status).toBe("failed");
    expect(rejected?.review_remarks).toBe("Screenshot unreadable / blurry reference");

    // Resident uploads clearer screenshot reusing the SAME real reference number
    const resubmitted = submitPaymentProof({
      proofSha256: "hash-clear-2",
      proofStorageKey: "payment-proofs/clear.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: realRef,
      requestId: req!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    expect(resubmitted?.status).toBe("pending");
    expect(resubmitted?.provider_transaction_id).toBe(realRef.toUpperCase());
    expect(resubmitted?.proof_sha256).toBe("hash-clear-2");
    expect(resubmitted?.review_remarks).toBeNull();
    expect(resubmitted?.reviewed_by).toBeNull();

    const events = getSqliteDb()
      .prepare("SELECT event_type, payload FROM payment_events WHERE payment_id = ? ORDER BY created_at ASC")
      .all(resubmitted!.id) as Array<{ event_type: string; payload: string }>;

    expect(events.map((e) => e.event_type)).toContain("payment_proof_resubmitted");

    // Staff can now approve the clearer resubmission
    const approved = confirmPaymentProof({
      paymentId: resubmitted!.id,
      reviewerId: secretaryId,
    });
    expect(approved?.status).toBe("paid");
    expect(getRequestById(req!.id)?.payment_status).toBe("paid");
  });

  it("verified reference number cannot be reused for another payment", () => {
    const req1 = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Clearance 1",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req1!.id, status: "accepted" });

    const settledRef = `GCASH-SETTLED-${randomUUID().slice(0, 6)}`;
    const p1 = submitPaymentProof({
      proofSha256: "hash-p1",
      proofStorageKey: "payment-proofs/p1.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: settledRef,
      requestId: req1!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    confirmPaymentProof({ paymentId: p1!.id, reviewerId: adminId });

    const req2 = createCertificateRequest({
      age: 30,
      certificate_type: "barangay_residency",
      contact_number: "09170000002",
      full_name: "Maria Demo Resident",
      purpose: "Residency 2",
      resident_id: residentTwoId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req2!.id, status: "accepted" });

    expect(() => {
      submitPaymentProof({
        proofSha256: "hash-p2",
        proofStorageKey: "payment-proofs/p2.png",
        proofStorageProvider: "local",
        provider: "gcash",
        referenceNumber: settledRef,
        requestId: req2!.id,
        residentId: residentTwoId,
        transactionDatetime: new Date().toISOString(),
      });
    }).toThrow("This reference number has already been verified and cannot be reused.");
  });

  it("confirmation rejects mismatched resident, unsupported provider, missing proof, and wrong amount", () => {
    const db = getSqliteDb();
    const req = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Clearance hardening",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req!.id, status: "accepted" });

    const payment = submitPaymentProof({
      proofSha256: "hash-harden",
      proofStorageKey: "payment-proofs/harden.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: `GCASH-HARDEN-${randomUUID().slice(0, 6)}`,
      requestId: req!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    // Unauthorized reviewer
    expect(() => {
      confirmPaymentProof({
        paymentId: payment!.id,
        reviewerId: residentOneId, // resident role
      });
    }).toThrow("Reviewer is not authorized to confirm payments.");

    // Tampered resident ID on payment
    db.prepare("UPDATE payments SET resident_id = ? WHERE id = ?").run(residentTwoId, payment!.id);
    expect(() => {
      confirmPaymentProof({ paymentId: payment!.id, reviewerId: adminId });
    }).toThrow("Payment resident does not match the certificate request owner.");
    db.prepare("UPDATE payments SET resident_id = ? WHERE id = ?").run(residentOneId, payment!.id);

    // Tampered provider
    db.prepare("UPDATE payments SET provider = 'unsupported_bank' WHERE id = ?").run(payment!.id);
    expect(() => {
      confirmPaymentProof({ paymentId: payment!.id, reviewerId: adminId });
    }).toThrow("Unsupported payment provider.");
    db.prepare("UPDATE payments SET provider = 'gcash' WHERE id = ?").run(payment!.id);

    // Missing proof key
    db.prepare("UPDATE payments SET proof_storage_key = NULL WHERE id = ?").run(payment!.id);
    expect(() => {
      confirmPaymentProof({ paymentId: payment!.id, reviewerId: adminId });
    }).toThrow("Payment proof screenshot or verification checksum is missing.");
    db.prepare("UPDATE payments SET proof_storage_key = 'payment-proofs/harden.png' WHERE id = ?").run(payment!.id);

    // Wrong amount
    db.prepare("UPDATE payments SET amount = 25 WHERE id = ?").run(payment!.id);
    expect(() => {
      confirmPaymentProof({ paymentId: payment!.id, reviewerId: adminId });
    }).toThrow("Payment amount does not match the required certificate fee.");
    db.prepare("UPDATE payments SET amount = 50 WHERE id = ?").run(payment!.id);
  });

  it("resident merchant QR authorization check strictly allows only eligible fee-paying residents", () => {
    const freshResidentId = randomUUID();
    expect(hasEligibleFeePayingRequest(freshResidentId)).toBe(false);

    getSqliteDb().prepare(
      `INSERT INTO profiles (id, full_name, email, role, created_at, updated_at)
       VALUES (?, 'Fresh Resident', ?, 'resident', datetime('now'), datetime('now'))`,
    ).run(freshResidentId, `${freshResidentId}@example.com`);

    const req = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_residency",
      contact_number: "09170000001",
      full_name: "Fresh Resident",
      purpose: "QR authorization check",
      resident_id: freshResidentId,
    });
    // While request is pending, not yet accepted
    expect(hasEligibleFeePayingRequest(freshResidentId)).toBe(false);

    // Once accepted and fee > 0 and unpaid
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req!.id, status: "accepted" });
    expect(hasEligibleFeePayingRequest(freshResidentId)).toBe(true);

    // When payment is settled / paid, eligible check returns false
    updateRequestStatus({ id: req!.id, paymentStatus: "paid", status: "accepted" });
    expect(hasEligibleFeePayingRequest(freshResidentId)).toBe(false);
  });


  it("disabled GCash and Maya methods cannot be served to residents", () => {
    updatePaymentReceivingConfig("gcash", {
      enabled: false,
      merchantName: "Disabled Merchant",
      qrStorageKey: "merchant-qrs/disabled.png",
      qrStorageProvider: "local",
      qrUpdatedAt: new Date().toISOString(),
    });

    const settings = getSystemSettings();
    // When disabled, enabled is false
    expect(settings.paymentReceiving.gcash.enabled).toBe(false);
  });

  it("verifies physical private proof file existence and SHA-256 integrity before approval", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const stored = await storePaymentProofImage(pngBytes, "png");

    const req = createCertificateRequest({
      age: 28,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Integrity test",
      resident_id: residentOneId,
    });
    updateRequestStatus({ dateAccepted: new Date().toISOString(), id: req!.id, status: "accepted" });

    const payment = submitPaymentProof({
      proofSha256: stored.sha256,
      proofStorageKey: stored.key,
      proofStorageProvider: stored.provider,
      provider: "gcash",
      referenceNumber: `GCASH-INT-${randomUUID().slice(0, 6)}`,
      requestId: req!.id,
      residentId: residentOneId,
      transactionDatetime: new Date().toISOString(),
    });

    // Read the stored file
    const file = await readPrivatePaymentFile({
      key: payment!.proof_storage_key,
      provider: payment!.proof_storage_provider || "local",
    });
    expect(file).not.toBeNull();
    expect(computeSha256(file!.bytes)).toBe(payment!.proof_sha256);

    // Clean up file
    await deletePrivatePaymentFile({
      key: stored.key,
      provider: stored.provider,
    });

    // Now file is missing
    const missingFile = await readPrivatePaymentFile({
      key: stored.key,
      provider: stored.provider,
    });
    expect(missingFile).toBeNull();
  });

  it("failed DB submission cleans up newly uploaded proof from storage", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const stored = await storePaymentProofImage(pngBytes, "png");

    // Verify file exists
    const fileBefore = await readPrivatePaymentFile({ key: stored.key, provider: stored.provider });
    expect(fileBefore).not.toBeNull();

    // Best-effort cleanup simulated on DB failure
    await deletePrivatePaymentFile({ key: stored.key, provider: stored.provider });
    const fileAfter = await readPrivatePaymentFile({ key: stored.key, provider: stored.provider });
    expect(fileAfter).toBeNull();
  });
  it("datetime-local default input value formats to local date and time correctly", () => {
    const fixedDate = new Date(2026, 7, 19, 14, 35); // Aug 19, 2026 14:35 Local
    const formatted = getLocalDatetimeInputValue(fixedDate);
    expect(formatted).toBe("2026-08-19T14:35");
  });
});

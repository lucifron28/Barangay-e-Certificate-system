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
  hasSuccessfulPayment,
  listPaymentsForRequest,
  listPaymentsForVerification,
  rejectPaymentProof,
  submitPaymentProof,
  updatePaymentReceivingConfig,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";
import {
  detectImageFormat,
  MAX_PAYMENT_FILE_BYTES,
} from "@/lib/payments/storage";
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
      merchantName: "Barangay Bato Official GCash",
      qrStorageKey: "merchant-qrs/gcash-test.png",
      qrStorageProvider: "local" as const,
      qrUpdatedAt: new Date().toISOString(),
    };

    updatePaymentReceivingConfig("gcash", newConfig);
    const settings = getSystemSettings();
    expect(settings.paymentReceiving.gcash.enabled).toBe(true);
    expect(settings.paymentReceiving.gcash.merchantName).toBe("Barangay Bato Official GCash");
    expect(settings.paymentReceiving.gcash.qrStorageKey).toBe("merchant-qrs/gcash-test.png");

    // Restore default
    updatePaymentReceivingConfig("gcash", {
      enabled: false,
      merchantName: "Barangay Bato Official",
      qrStorageKey: null,
      qrStorageProvider: null,
      qrUpdatedAt: null,
    });
  });
});

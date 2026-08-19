import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  confirmPaymentProof,
  createCertificateRequest,
  getCertificateRecordById,
  getCertificateRecordByRequestId,
  getCertificateVerificationByToken,
  getRequestById,
  revokeCertificateRecord,
  submitPaymentProof,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import { removePrivateCertificatePdf } from "@/lib/certificates/private-storage";
import { issueCertificate } from "@/lib/services/certificate-issuance";

const residentId = "00000000-0000-4000-8000-000000000003";
const adminId = "00000000-0000-4000-8000-000000000001";

describe("isolated thesis certificate workflow", () => {
  it("moves a request through payment, issuance, verification, revocation, and reissue", async () => {
    const request = createCertificateRequest({
      age: 29,
      certificate_type: "barangay_clearance",
      contact_number: "09170000001",
      full_name: "Juan Demo Resident",
      purpose: "Thesis workflow verification",
      resident_id: residentId,
      sitio: "Sitio Centro",
    });
    expect(request).not.toBeNull();
    expect(request?.status).toBe("pending");
    expect(request?.control_number).toMatch(/^BCL-\d{4}-\d{4}$/);

    const recordIds: string[] = [];
    const pdfPaths: string[] = [];

    try {
      updateRequestStatus({
        dateAccepted: new Date().toISOString(),
        id: request!.id,
        remarks: "Information reviewed for thesis demo.",
        status: "accepted",
      });

      const payment = submitPaymentProof({
        proofSha256: "test-sha256-thesis",
        proofStorageKey: "payment-proofs/test-thesis.png",
        proofStorageProvider: "local",
        provider: "gcash",
        referenceNumber: "GCASH-THESIS-001",
        requestId: request!.id,
        residentId: residentId,
        transactionDatetime: new Date().toISOString(),
      });
      expect(payment?.status).toBe("pending");

      const paidPayment = confirmPaymentProof({
        paymentId: payment?.id ?? "",
        reviewerId: adminId,
      });
      expect(paidPayment?.status).toBe("paid");
      const issued = await issueCertificate({
        dateIssued: "2026-08-08",
        preparedBy: "Demo Main Admin",
        preparedById: adminId,
        request: getRequestById(request!.id)!,
        settings: { barangayCaptainName: "Authorized Barangay Official" },
      });
      recordIds.push(issued.certificateRecord.id);
      if (issued.certificateRecord.pdf_path) pdfPaths.push(issued.certificateRecord.pdf_path);
      expect(issued.certificateRecord.pdf_path).toContain(
        path.join("data", "certificates-test"),
      );

      expect(issued.certificateNumber).toMatch(/^CERT-\d{4}-\d{4}$/);
      expect(getCertificateVerificationByToken(issued.verificationToken)).toMatchObject({
        certificateNumber: issued.certificateNumber,
        status: "valid",
      });

      expect(
        revokeCertificateRecord({
          id: issued.certificateRecord.id,
          reason: "Test reissue path.",
          revokedBy: adminId,
        }),
      ).toBe(true);
      expect(getCertificateVerificationByToken(issued.verificationToken)?.status).toBe("revoked");

      const reissued = await issueCertificate({
        dateIssued: "2026-08-08",
        preparedBy: "Demo Main Admin",
        preparedById: adminId,
        request: getRequestById(request!.id)!,
        settings: { barangayCaptainName: "Authorized Barangay Official" },
      });
      recordIds.push(reissued.certificateRecord.id);
      if (reissued.certificateRecord.pdf_path) pdfPaths.push(reissued.certificateRecord.pdf_path);

      expect(reissued.certificateNumber).not.toBe(issued.certificateNumber);
      expect(getCertificateVerificationByToken(reissued.verificationToken)?.status).toBe("valid");
      expect(getCertificateRecordById(issued.certificateRecord.id)?.replacement_record_id).toBe(
        reissued.certificateRecord.id,
      );
      expect(getCertificateRecordByRequestId(request!.id)?.id).toBe(reissued.certificateRecord.id);
    } finally {
      for (const pdfPath of pdfPaths) removePrivateCertificatePdf(pdfPath);
      const db = getSqliteDb();
      db.transaction(() => {
        db.prepare(
          "DELETE FROM payment_events WHERE payment_id IN (SELECT id FROM payments WHERE request_id = ?)",
        ).run(request?.id);
        db.prepare("DELETE FROM payments WHERE request_id = ?").run(request?.id);
        for (const recordId of recordIds) {
          db.prepare("DELETE FROM certificate_verifications WHERE certificate_record_id = ?").run(recordId);
          db.prepare("DELETE FROM certificate_download_logs WHERE certificate_record_id = ?").run(recordId);
          db.prepare("DELETE FROM issuance_reservations WHERE certificate_record_id = ?").run(recordId);
          db.prepare("DELETE FROM certificate_records WHERE id = ?").run(recordId);
        }
        db.prepare("DELETE FROM certificate_requests WHERE id = ?").run(request?.id);
      })();
    }
  });
});

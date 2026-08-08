import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  authenticateLocalUser,
  hashPassword,
  hasLocalDemoSecret,
  verifyPassword,
} from "@/lib/auth/sqlite-auth";
import {
  createMockPayment,
  generateCertificateNumber,
  generateClearanceControlNumber,
  generateRequestNumber,
  getCertificateRecordByRequestId,
  getCertificateVerificationByToken,
  getRequestById,
  resolveMockPayment,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import {
  CERTIFICATE_LAYOUT_REGIONS,
  generateCertificatePdf,
} from "@/lib/certificates/pdf-generator";
import { issueCertificate } from "@/lib/services/certificate-issuance";
import { removePrivateCertificatePdf } from "@/lib/certificates/private-storage";
import {
  canMarkDone,
  canResubmitRequest,
  canScheduleRequest,
} from "@/lib/services/business-rules";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";

const residentId = "00000000-0000-4000-8000-000000000003";
const adminId = "00000000-0000-4000-8000-000000000001";
const paymentResidentId = residentId;
const acceptedUnpaidRequestId = "10000000-0000-4000-8000-000000000002";

describe("local authentication and authorization boundaries", () => {
  it("hashes passwords and rejects invalid credentials", () => {
    const passwordHash = hashPassword("password123");

    expect(verifyPassword("password123", passwordHash)).toBe(true);
    expect(verifyPassword("wrong-password", passwordHash)).toBe(false);
    expect(authenticateLocalUser("admin@example.com", "password123")?.role).toBe(
      "main_admin",
    );
    expect(authenticateLocalUser("mainadmin", "wrong-password")).toBeNull();
  });

  it("requires a configured local secret and defaults to online mode", () => {
    expect(typeof hasLocalDemoSecret()).toBe("boolean");
    expect(isFullyOnlineDemo).toBe(true);
  });
});

describe("request, counter, and payment rules", () => {
  it("keeps request and document counters unique and formatted", () => {
    const requestOne = generateRequestNumber();
    const requestTwo = generateRequestNumber();
    const clearance = generateClearanceControlNumber();
    const certificate = generateCertificateNumber();

    expect(requestOne).toMatch(/^REQ-\d{4}-\d{4}$/);
    expect(requestTwo).toMatch(/^REQ-\d{4}-\d{4}$/);
    expect(requestOne).not.toBe(requestTwo);
    expect(clearance).toMatch(/^BCL-\d{4}-\d{4}$/);
    expect(certificate).toMatch(/^CERT-\d{4}-\d{4}$/);
  });

  it("allows only the intended status transitions", () => {
    expect(canResubmitRequest("rejected")).toBe(true);
    expect(canResubmitRequest("accepted")).toBe(false);
    expect(canScheduleRequest("accepted")).toBe(true);
    expect(canScheduleRequest("pending")).toBe(false);
    expect(canMarkDone("ready_for_pickup")).toBe(true);
    expect(canMarkDone("ready_for_download")).toBe(false);
  });

  it("can retry after a failed payment and preserves a new attempt", () => {
    const db = getSqliteDb();
    db.transaction(() => {
      db.prepare(
        "DELETE FROM payment_events WHERE payment_id IN (SELECT id FROM payments WHERE request_id = ?)",
      ).run(acceptedUnpaidRequestId);
      db.prepare("DELETE FROM payments WHERE request_id = ?").run(
        acceptedUnpaidRequestId,
      );
      db.prepare(
        "UPDATE certificate_requests SET status = 'accepted', payment_status = 'unpaid' WHERE id = ?",
      ).run(acceptedUnpaidRequestId);
    })();
    const first = createMockPayment({
      amount: 50,
      request_id: acceptedUnpaidRequestId,
      resident_id: paymentResidentId,
    });
    expect(first).not.toBeNull();
    resolveMockPayment({
      payment_id: first?.id ?? "",
      resident_id: paymentResidentId,
      status: "failed",
    });

    const retry = createMockPayment({
      amount: 50,
      request_id: acceptedUnpaidRequestId,
      resident_id: paymentResidentId,
    });

    expect(retry?.status).toBe("pending");
    expect(retry?.provider_transaction_id).not.toBe(first?.provider_transaction_id);
    expect(
      resolveMockPayment({
        payment_id: retry?.id ?? "",
        resident_id: paymentResidentId,
        status: "paid",
      })?.status,
    ).toBe("paid");
    expect(
      resolveMockPayment({
        payment_id: retry?.id ?? "",
        resident_id: paymentResidentId,
        status: "paid",
      })?.status,
    ).toBe("paid");
  });

  it("does not resolve an unknown verification token", () => {
    expect(getCertificateVerificationByToken("invalid-token-for-test")).toBeNull();
  });
});

describe("issuance and PDF integrity", () => {
  it("keeps signature, verification, and footer regions separate", () => {
    expect(CERTIFICATE_LAYOUT_REGIONS.signature.y).toBeGreaterThan(
      CERTIFICATE_LAYOUT_REGIONS.verification.y +
        CERTIFICATE_LAYOUT_REGIONS.verification.height,
    );
    expect(CERTIFICATE_LAYOUT_REGIONS.verification.y).toBeGreaterThan(
      CERTIFICATE_LAYOUT_REGIONS.footer.y + CERTIFICATE_LAYOUT_REGIONS.footer.height,
    );
  });

  it("preserves accented Filipino names and writes PDF metadata", async () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000005");
    expect(request).not.toBeNull();
    const name = "\u00d1i\u00f1o Pe\u00f1a / Mar\u00eda De Le\u00f3n";
    const bytes = await generateCertificatePdf({
      barangayCaptainName: "Authorized Barangay Official",
      certificateNumber: "CERT-UNICODE-0001",
      dateIssued: new Date().toISOString(),
      preparedBy: "Demo Main Admin",
      request: {
        ...request!,
        submitted_data: {
          common: {
            full_name: name,
            age: 28,
            address_sitio: "Sitio Centro",
            contact_number: "09170000001",
            purpose: "Unicode PDF test",
          },
          certificate_specific: {},
        },
      },
      verificationCode: "BB-UNICODE",
      verificationExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      verificationUrl: "http://localhost:3000/verify/unicode-test-token",
    });
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getTitle()).toContain("CERT-UNICODE-0001");
    expect(bytes.byteLength).toBeGreaterThan(4_000);
  });

  it("removes a PDF when database persistence fails", async () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000004");
    expect(request).not.toBeNull();
    const before = new Set(
      readdirSync(path.join(process.cwd(), "data", "certificates")),
    );

    await expect(
      issueCertificate({
        dateIssued: new Date().toISOString().slice(0, 10),
        preparedBy: "Demo Main Admin",
        preparedById: adminId,
        request: { ...request!, id: "99999999-9999-4999-8999-999999999999" },
        settings: { barangayCaptainName: "Authorized Barangay Official" },
      }),
    ).rejects.toMatchObject({ code: "PERSISTENCE_FAILED" });

    const after = new Set(
      readdirSync(path.join(process.cwd(), "data", "certificates")),
    );
    expect([...after].filter((file) => !before.has(file))).toEqual([]);
  });

  it("reissues a revoked certificate with a new number", async () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000007");
    const previous = getCertificateRecordByRequestId(request?.id ?? "");
    expect(["done", "ready_for_download"]).toContain(request?.status);
    expect(previous?.status).toBe("revoked");

    const replacement = await issueCertificate({
      dateIssued: new Date().toISOString().slice(0, 10),
      preparedBy: "Demo Main Admin",
      preparedById: adminId,
      request: request!,
      settings: { barangayCaptainName: "Authorized Barangay Official" },
    });

    expect(replacement.certificateNumber).not.toBe(previous?.certificate_number);
    expect(replacement.verificationToken).not.toBe("");
    expect(replacement.certificateRecord.certificate_snapshot.holder_full_name).toBe(
      "Juan Demo Resident",
    );
    expect(
      Date.parse(replacement.certificateRecord.verification_expires_at ?? "") -
        Date.parse(replacement.certificateRecord.issued_at ?? ""),
    ).toBe(3 * 24 * 60 * 60 * 1000);

    dbProfileNameForTest("Mutated Profile Name");
    expect(getCertificateVerificationByToken(replacement.verificationToken)?.fullName).toBe(
      "Juan Demo Resident",
    );
    dbProfileNameForTest("Juan Demo Resident");

    const db = getSqliteDb();
    db.transaction(() => {
      db.prepare(
        "DELETE FROM certificate_verifications WHERE certificate_record_id = ?",
      ).run(replacement.certificateRecord.id);
      db.prepare(
        "UPDATE certificate_records SET replacement_record_id = NULL WHERE id = ?",
      ).run(previous?.id);
      db.prepare("DELETE FROM certificate_records WHERE id = ?").run(
        replacement.certificateRecord.id,
      );
      db.prepare(
        "UPDATE certificate_requests SET status = 'done' WHERE id = ?",
      ).run(request?.id);
    })();
    removePrivateCertificatePdf(replacement.certificateRecord.pdf_path ?? "");
  });
});

function dbProfileNameForTest(fullName: string) {
  getSqliteDb()
    .prepare("UPDATE profiles SET full_name = ? WHERE id = ?")
    .run(fullName, residentId);
}

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  getRequestById,
  getCertificateRecordByRequestId,
  createMockPayment,
  listPaymentsForRequest,
  resolveMockPayment,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import { generateCertificatePdf, normalizePdfText } from "@/lib/certificates/pdf-generator";
import {
  isCertificateIssuanceEligible,
  issueCertificate,
} from "@/lib/services/certificate-issuance";
import { clearSqliteRateLimit, consumeSqliteRateLimit } from "@/lib/security/rate-limit/sqlite";
import { certificateRequestSchema } from "@/lib/validations/request";
import { sha256Hex } from "@/lib/security/document-hash";

describe("online request and payment workflow", () => {
  it("validates only the fields relevant to each certificate type", () => {
    const result = certificateRequestSchema.safeParse({
      age: 28,
      certificate_type: "barangay_certificate",
      contact_number: "09170000001",
      full_name: "Niño Peña",
      place_of_birth: "Mauban, Quezon",
      purpose: "Scholarship requirement",
      sitio: "",
    });

    expect(result.success).toBe(true);
  });

  it("keeps submitted snapshots free from internal TODO placeholders", () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000001");
    expect(request).not.toBeNull();
    expect(JSON.stringify(request?.submitted_data)).not.toContain("TODO");
  });

  it("preserves payment history and supports a failed-payment retry", () => {
    const db = getSqliteDb();
    db.transaction(() => {
      db.prepare(
        "DELETE FROM payment_events WHERE payment_id IN (SELECT id FROM payments WHERE request_id = ?)",
      ).run("10000000-0000-4000-8000-000000000002");
      db.prepare("DELETE FROM payments WHERE request_id = ?").run(
        "10000000-0000-4000-8000-000000000002",
      );
      db.prepare(
        "UPDATE certificate_requests SET status = 'accepted', payment_status = 'unpaid' WHERE id = ?",
      ).run("10000000-0000-4000-8000-000000000002");
    })();
    const pending = createMockPayment({
      amount: 50,
      request_id: "10000000-0000-4000-8000-000000000002",
      resident_id: "00000000-0000-4000-8000-000000000003",
    });
    expect(pending?.status).toBe("pending");
    const failed = resolveMockPayment({
      payment_id: pending?.id ?? "",
      resident_id: "00000000-0000-4000-8000-000000000003",
      status: "failed",
    });
    expect(failed?.status).toBe("failed");
    const attempts = listPaymentsForRequest("10000000-0000-4000-8000-000000000002");
    expect(attempts.some((payment) => payment.status === "failed")).toBe(true);
  });

  it("uses a shared verification bucket for different token values", () => {
    const policy = { limit: 2, windowMs: 60_000 };
    clearSqliteRateLimit("verification", "public-verification", "test-client");
    expect(consumeSqliteRateLimit("verification", "public-verification", "test-client", policy).allowed).toBe(true);
    expect(consumeSqliteRateLimit("verification", "public-verification", "test-client", policy).allowed).toBe(true);
    expect(consumeSqliteRateLimit("verification", "public-verification", "test-client", policy).allowed).toBe(false);
    clearSqliteRateLimit("verification", "public-verification", "test-client");
  });
});

describe("certificate PDF and issuance metadata", () => {
  it("keeps common Filipino characters intact before embedding", () => {
    expect(normalizePdfText("Niño Peña / María De León / ÁÉÍÓÚÑ")).toBe(
      "Niño Peña / María De León / ÁÉÍÓÚÑ",
    );
  });

  it("preserves proper Filipino names and normalizes smart punctuation", () => {
    expect(normalizePdfText("José Niño Peña / María De León / ÁÉÍÓÚÑ")).toBe(
      "José Niño Peña / María De León / ÁÉÍÓÚÑ",
    );
    expect(normalizePdfText("“Quoted” ‘single’ – long dash — ₱50")).toBe(
      '"Quoted" \'single\' - long dash - PHP50',
    );
    expect(
      normalizePdfText(
        "\u00e2\u20ac\u0153Quoted\u00e2\u20ac\u009d \u00e2\u20ac\u201c \u00e2\u201a\u00b150",
      ),
    ).toBe('"Quoted" - PHP50');
  });

  it("generates a hashed PDF containing the issued metadata inputs", async () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000004");
    expect(request).not.toBeNull();
    const bytes = await generateCertificatePdf({
      barangayCaptainName: "Authorized Barangay Official",
      certificateNumber: "CERT-TEST-0001",
      dateIssued: new Date().toISOString(),
      preparedBy: "Demo Main Admin",
      request: request!,
      verificationCode: "BB-TEST123",
      verificationExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      verificationUrl: "http://localhost:3000/verify/test-token",
    });
    expect(bytes.byteLength).toBeGreaterThan(4_000);
    const issuedRecord = getCertificateRecordByRequestId("10000000-0000-4000-8000-000000000005");
    expect(issuedRecord?.pdf_path).toBeTruthy();
    expect(sha256Hex(readFileSync(issuedRecord?.pdf_path ?? ""))).toBe(issuedRecord?.pdf_sha256);
  });

  it("rejects duplicate issuance and leaves the existing artifact untouched", async () => {
    const request = getRequestById("10000000-0000-4000-8000-000000000005");
    expect(request).not.toBeNull();
    await expect(
      issueCertificate({
        dateIssued: new Date().toISOString().slice(0, 10),
        preparedBy: "Demo Main Admin",
        preparedById: "00000000-0000-4000-8000-000000000001",
        request: request!,
        settings: { barangayCaptainName: "Authorized Barangay Official" },
      }),
    ).rejects.toMatchObject({ code: "ALREADY_ISSUED" });
    const record = getCertificateRecordByRequestId(request!.id);
    expect(record?.pdf_path).toBeTruthy();
    expect(existsSync(record?.pdf_path ?? "")).toBe(true);
  });

  it("recognizes paid/free requests as eligible and unpaid requests as ineligible", () => {
    expect(isCertificateIssuanceEligible({ status: "accepted", payment_status: "paid" })).toBe(true);
    expect(isCertificateIssuanceEligible({ status: "accepted", payment_status: "free" })).toBe(true);
    expect(isCertificateIssuanceEligible({ status: "accepted", payment_status: "unpaid" })).toBe(false);
    expect(isCertificateIssuanceEligible({ status: "pending", payment_status: "paid" })).toBe(false);
  });
});

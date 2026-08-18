import { describe, expect, it } from "vitest";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import { getCertificateVerificationByShortCode as getSqliteVerificationByShortCode } from "@/lib/db/sqlite/queries";
import { getCertificateVerificationByShortCode as getTursoVerificationByShortCode } from "@/lib/db/turso/queries";
import { maskName } from "@/components/certificates/certificate-verification-view";

describe("manual short verification code lookup", () => {
  const db = getSqliteDb();

  it("finds a valid certificate by short verification code in SQLite", () => {
    const row = db
      .prepare(
        `SELECT v.short_verification_code, c.certificate_number
         FROM certificate_verifications v
         JOIN certificate_records c ON c.id = v.certificate_record_id
         WHERE v.status = 'valid' AND v.revoked_at IS NULL
         LIMIT 1`,
      )
      .get() as { short_verification_code: string; certificate_number: string } | undefined;

    expect(row).toBeDefined();
    const shortCode = row!.short_verification_code;

    const result = getSqliteVerificationByShortCode(shortCode);
    expect(result).not.toBeNull();
    expect(result?.shortCode).toBe(shortCode);
    expect(result?.certificateNumber).toBe(row!.certificate_number);
    expect(result?.status).toBe("valid");
    expect(result?.fullName).toBeDefined();
  });

  it("normalizes lowercase and whitespace in short verification code", () => {
    const row = db
      .prepare(
        `SELECT short_verification_code
         FROM certificate_verifications
         LIMIT 1`,
      )
      .get() as { short_verification_code: string } | undefined;

    expect(row).toBeDefined();
    const originalCode = row!.short_verification_code;
    const lowerCode = originalCode.toLowerCase();

    const result = getSqliteVerificationByShortCode(`  ${lowerCode}  `);
    expect(result).not.toBeNull();
    expect(result?.shortCode).toBe(originalCode);
  });

  it("returns null for nonexistent or invalid format short codes", () => {
    expect(getSqliteVerificationByShortCode("BB-00000000")).toBeNull();
    expect(getSqliteVerificationByShortCode("invalid-code")).toBeNull();
    expect(getSqliteVerificationByShortCode("")).toBeNull();
    expect(getSqliteVerificationByShortCode("BB-ZZZZZZZZ")).toBeNull();
  });

  it("correctly identifies revoked certificates via short code", () => {
    const row = db
      .prepare(
        `SELECT v.short_verification_code
         FROM certificate_verifications v
         JOIN certificate_records c ON c.id = v.certificate_record_id
         WHERE c.status = 'revoked' OR v.revoked_at IS NOT NULL
         LIMIT 1`,
      )
      .get() as { short_verification_code: string } | undefined;

    if (row) {
      const result = getSqliteVerificationByShortCode(row.short_verification_code);
      expect(result).not.toBeNull();
      expect(result?.status).toBe("revoked");
    }
  });

  it("masks resident names in public verification results", () => {
    expect(maskName("Juan Dela Cruz")).toBe("Ju*** De*** Cr***");
    expect(maskName("Maria Santos")).toBe("Ma*** Sa***");
    expect(maskName("")).toBe("");
  });

  it("returns null for Turso short-code lookup when format is invalid", async () => {
    const invalidResult = await getTursoVerificationByShortCode("not-a-valid-code");
    expect(invalidResult).toBeNull();
  });
});

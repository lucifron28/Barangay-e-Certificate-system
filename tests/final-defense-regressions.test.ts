import { describe, expect, it } from "vitest";
import { getCertificateDownloadDenial } from "@/lib/certificates/certificate-download";
import {
  getCertificateDisplayStatus,
  isVerificationExpired,
} from "@/lib/certificates/certificate-status";
import { getCertificateRecordByRequestId } from "@/lib/db/sqlite/queries";
import { canMarkReady } from "@/lib/services/business-rules";
import { isCertificateIssuanceConfigured } from "@/lib/services/certificate-lifecycle";

describe("final defense regression matrix", () => {
  it("applies the exact expiry boundary to both display status and download access", () => {
    const source = getCertificateRecordByRequestId(
      "10000000-0000-4000-8000-000000000005",
    );
    expect(source).not.toBeNull();

    const expiresAt = "2026-08-08T04:00:00.000Z";
    const boundaryRecord = {
      ...source!,
      replacement_record_id: null,
      status: "issued" as const,
      verification_expires_at: expiresAt,
    };
    const now = Date.parse(expiresAt);

    expect(isVerificationExpired(expiresAt, now)).toBe(true);
    expect(getCertificateDisplayStatus(boundaryRecord, now)).toBe("expired");
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        integrityChecked: true,
        integrityValid: true,
        now,
        record: boundaryRecord,
        residentId: boundaryRecord.resident_id,
      }),
    ).toBe("denied_expired");
  });

  it("keeps hybrid transitions and deployment boundaries fail-closed", () => {
    expect(canMarkReady("accepted", true)).toBe(true);
    expect(canMarkReady("pending", true)).toBe(false);
    expect(canMarkReady("rejected", true)).toBe(false);
    expect(canMarkReady("cancelled", true)).toBe(false);
    expect(canMarkReady("done", true)).toBe(false);
    expect(isCertificateIssuanceConfigured("sqlite")).toBe(true);
    expect(isCertificateIssuanceConfigured("supabase")).toBe(false);
  });
});

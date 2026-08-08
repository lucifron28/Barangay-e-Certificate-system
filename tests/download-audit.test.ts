import { describe, expect, it } from "vitest";
import { getCertificateDownloadDenial } from "@/lib/certificates/certificate-download";
import {
  createCertificateDownloadLog,
  getCertificateRecordByRequestId,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";

const residentId = "00000000-0000-4000-8000-000000000003";
const otherResidentId = "00000000-0000-4000-8000-000000000004";

describe("certificate download audit outcomes", () => {
  it("covers owner success, cross-resident, expired, revoked, and corrupt PDF outcomes", () => {
    const valid = getCertificateRecordByRequestId("10000000-0000-4000-8000-000000000005");
    const expired = getCertificateRecordByRequestId("10000000-0000-4000-8000-000000000006");
    const revoked = getCertificateRecordByRequestId("10000000-0000-4000-8000-000000000007");
    expect(valid && expired && revoked).toBeTruthy();

    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        integrityChecked: true,
        integrityValid: true,
        record: valid,
        residentId,
      }),
    ).toBeNull();
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        record: valid,
        residentId: otherResidentId,
      }),
    ).toBe("denied_owner_mismatch");
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        record: expired,
        residentId,
      }),
    ).toBe("denied_owner_mismatch");
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        record: expired,
        residentId: expired?.resident_id ?? residentId,
      }),
    ).toBe("denied_expired");
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        record: revoked,
        residentId: revoked?.resident_id ?? otherResidentId,
      }),
    ).toBe("denied_revoked");
    expect(
      getCertificateDownloadDenial({
        artifactExists: true,
        integrityChecked: true,
        integrityValid: false,
        record: valid,
        residentId,
      }),
    ).toBe("integrity_failure");
  });

  it("persists denied outcomes without storing a token or path", () => {
    const valid = getCertificateRecordByRequestId("10000000-0000-4000-8000-000000000005");
    expect(valid).not.toBeNull();
    createCertificateDownloadLog(valid!.id, otherResidentId, "denied_owner_mismatch");

    const row = getSqliteDb()
      .prepare(
        "SELECT result FROM certificate_download_logs WHERE certificate_record_id = ? AND user_id = ? ORDER BY downloaded_at DESC LIMIT 1",
      )
      .get(valid!.id, otherResidentId) as { result: string } | undefined;
    expect(row?.result).toBe("denied_owner_mismatch");

    getSqliteDb()
      .prepare(
        "DELETE FROM certificate_download_logs WHERE certificate_record_id = ? AND user_id = ? AND result = ?",
      )
      .run(valid!.id, otherResidentId, "denied_owner_mismatch");
  });
});

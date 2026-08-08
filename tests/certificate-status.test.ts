import { describe, expect, it } from "vitest";
import {
  certificateStatusAlertClass,
  certificateStatusBadgeClass,
  certificateStatusMessage,
  getCertificateDisplayStatus,
} from "@/lib/certificates/certificate-status";

describe("certificate release status", () => {
  const now = Date.parse("2026-08-08T04:00:00.000Z");

  it("keeps valid certificates available until the exact expiry boundary", () => {
    expect(
      getCertificateDisplayStatus(
        { replacement_record_id: null, status: "issued", verification_expires_at: "2026-08-08T04:00:00.001Z" },
        now,
      ),
    ).toBe("valid");
    expect(
      getCertificateDisplayStatus(
        { replacement_record_id: null, status: "issued", verification_expires_at: "2026-08-08T04:00:00.000Z" },
        now,
      ),
    ).toBe("expired");
  });

  it("prioritizes replacement and revocation states over expiry", () => {
    expect(
      getCertificateDisplayStatus(
        { replacement_record_id: "replacement-id", status: "revoked", verification_expires_at: "2026-08-01T04:00:00.000Z" },
        now,
      ),
    ).toBe("replaced");
    expect(
      getCertificateDisplayStatus(
        { replacement_record_id: null, status: "revoked", verification_expires_at: "2026-08-15T04:00:00.000Z" },
        now,
      ),
    ).toBe("revoked");
  });

  it("provides explicit DaisyUI classes and explanatory copy", () => {
    expect(certificateStatusBadgeClass("valid")).toBe("badge-success");
    expect(certificateStatusAlertClass("replaced")).toBe("alert-info");
    expect(certificateStatusMessage("expired")).toContain("verification window");
  });
});

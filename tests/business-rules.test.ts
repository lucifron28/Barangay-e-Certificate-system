import { describe, expect, it } from "vitest";
import {
  canCancelRequest,
  canRejectRequest,
  canResubmitRequest,
  getCertificateFee,
  getDefaultPaymentStatus,
} from "@/lib/services/business-rules";

describe("certificate request business rules", () => {
  it("assigns the confirmed fees and payment defaults", () => {
    expect(getCertificateFee("barangay_clearance")).toBe(50);
    expect(getCertificateFee("barangay_certificate")).toBe(50);
    expect(getCertificateFee("barangay_indigency")).toBe(0);
    expect(getDefaultPaymentStatus("barangay_indigency")).toBe("free");
    expect(getDefaultPaymentStatus("barangay_residency")).toBe("unpaid");
  });

  it("allows only pending residents to cancel or be rejected", () => {
    expect(canCancelRequest("pending")).toBe(true);
    expect(canCancelRequest("accepted")).toBe(false);
    expect(canRejectRequest("pending")).toBe(true);
    expect(canRejectRequest("accepted")).toBe(false);
  });

  it("allows rejected requests to be edited and resubmitted", () => {
    expect(canResubmitRequest("rejected")).toBe(true);
    expect(canResubmitRequest("accepted")).toBe(false);
  });
});

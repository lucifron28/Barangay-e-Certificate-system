import { describe, expect, it } from "vitest";
import {
  canCancelRequest,
  canMarkReady,
  canRejectRequest,
  getCertificateFee,
  getDefaultPaymentStatus,
  isWithinOfficeHours,
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

  it("requires an accepted request and a schedule before ready status", () => {
    expect(canMarkReady("accepted", true)).toBe(true);
    expect(canMarkReady("accepted", false)).toBe(false);
    expect(canMarkReady("rejected", true)).toBe(false);
  });
});

describe("pickup schedule office hours", () => {
  it("accepts weekday appointments from 8:00 AM through 5:00 PM", () => {
    expect(isWithinOfficeHours("2026-08-03", "08:00")).toBe(true);
    expect(isWithinOfficeHours("2026-08-03", "17:00")).toBe(true);
  });

  it("rejects weekends and out-of-hours appointments", () => {
    expect(isWithinOfficeHours("2026-08-02", "10:00")).toBe(false);
    expect(isWithinOfficeHours("2026-08-03", "07:59")).toBe(false);
    expect(isWithinOfficeHours("2026-08-03", "17:01")).toBe(false);
  });
});

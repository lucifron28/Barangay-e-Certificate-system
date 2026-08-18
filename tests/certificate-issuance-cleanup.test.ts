import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateCertificatePdf: vi.fn(),
  removeStoredCertificatePdf: vi.fn(),
  storeCertificatePdf: vi.fn(),
  getCertificateRecordByRequestId: vi.fn(),
  getIssuedCertificateRecordByRequestId: vi.fn(),
  getProfileById: vi.fn(),
  hasSuccessfulPayment: vi.fn(),
  generateVerificationToken: vi.fn(),
  persistIssuedCertificate: vi.fn(),
  releaseCertificateIssuanceReservation: vi.fn(),
  reserveCertificateIssuance: vi.fn(),
  sha256Hex: vi.fn(),
}));

vi.mock("@/lib/certificates/pdf-generator", () => ({
  CertificatePdfLayoutError: class CertificatePdfLayoutError extends Error {},
  generateCertificatePdf: mocks.generateCertificatePdf,
}));
vi.mock("@/lib/certificates/snapshot", () => ({
  createCertificateSnapshot: vi.fn(() => ({
    holder_full_name: "Test Resident",
  })),
}));
vi.mock("@/lib/certificates/private-storage", () => ({
  removeStoredCertificatePdf: mocks.removeStoredCertificatePdf,
  storeCertificatePdf: mocks.storeCertificatePdf,
}));
vi.mock("@/lib/db/queries", () => ({
  getCertificateRecordByRequestId: mocks.getCertificateRecordByRequestId,
  getIssuedCertificateRecordByRequestId:
    mocks.getIssuedCertificateRecordByRequestId,
  getProfileById: mocks.getProfileById,
  hasSuccessfulPayment: mocks.hasSuccessfulPayment,
  generateVerificationToken: mocks.generateVerificationToken,
  persistIssuedCertificate: mocks.persistIssuedCertificate,
  releaseCertificateIssuanceReservation:
    mocks.releaseCertificateIssuanceReservation,
  reserveCertificateIssuance: mocks.reserveCertificateIssuance,
}));
vi.mock("@/lib/security/document-hash", () => ({
  sha256Hex: mocks.sha256Hex,
}));
vi.mock("@/lib/env", () => ({
  env: { appUrl: "http://localhost:3000" },
}));
vi.mock("@/lib/services/issuance-mode", () => ({
  issuanceMode: "fully_online_demo",
}));
vi.mock("@/lib/certificates/certificate-status", () => ({
  isVerificationExpired: vi.fn(() => false),
}));

import { issueCertificate } from "@/lib/services/certificate-issuance";

const request = {
  id: "request-1",
  request_number: "REQ-2026-0001",
  resident_id: "resident-1",
  certificate_type: "barangay_indigency",
  purpose: "Medical assistance",
  status: "accepted",
  payment_status: "free",
  submitted_data: {
    common: {
      full_name: "Test Resident",
      age: 28,
      address_sitio: "Sitio Centro",
      contact_number: "09000000000",
      purpose: "Medical assistance",
    },
    certificate_specific: {},
  },
} as never;

const issuedRecord = {
  id: "certificate-1",
  request_id: "request-1",
  certificate_number: "CERT-2026-0001",
} as never;

async function attemptIssuance() {
  return issueCertificate({
    dateIssued: "2026-08-18",
    preparedBy: "Demo Main Admin",
    preparedById: "admin-1",
    request,
    settings: { barangayCaptainName: "Authorized Barangay Official" },
  });
}

describe("certificate issuance cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfileById.mockResolvedValue({
      id: "admin-1",
      role: "main_admin",
    });
    mocks.getCertificateRecordByRequestId.mockResolvedValue(null);
    mocks.getIssuedCertificateRecordByRequestId.mockResolvedValue(null);
    mocks.reserveCertificateIssuance.mockResolvedValue("CERT-2026-0001");
    mocks.generateVerificationToken.mockReturnValue("verification-token");
    mocks.generateCertificatePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.storeCertificatePdf.mockResolvedValue({
      key: "certificates/certificate-1.pdf",
      path: null,
      provider: "vercel_blob",
    });
    mocks.removeStoredCertificatePdf.mockResolvedValue(undefined);
    mocks.releaseCertificateIssuanceReservation.mockResolvedValue(undefined);
    mocks.persistIssuedCertificate.mockResolvedValue(issuedRecord);
    mocks.sha256Hex.mockReturnValue("pdf-hash");
  });

  it("releases the reservation after persistence fails", async () => {
    const originalError = new Error("database finalization failed");
    mocks.persistIssuedCertificate.mockRejectedValueOnce(originalError);

    await expect(attemptIssuance()).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      cause: originalError,
    });

    expect(mocks.removeStoredCertificatePdf).toHaveBeenCalledOnce();
    expect(mocks.releaseCertificateIssuanceReservation).toHaveBeenCalledOnce();
  });

  it("still releases the reservation when Blob deletion fails", async () => {
    const originalError = new Error("database finalization failed");
    mocks.persistIssuedCertificate.mockRejectedValueOnce(originalError);
    mocks.removeStoredCertificatePdf.mockRejectedValueOnce(
      new Error("blob delete failed"),
    );

    await expect(attemptIssuance()).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      cause: originalError,
    });

    expect(mocks.releaseCertificateIssuanceReservation).toHaveBeenCalledOnce();
  });

  it("preserves retryability after cleanup failure", async () => {
    const originalError = new Error("database finalization failed");
    mocks.persistIssuedCertificate
      .mockRejectedValueOnce(originalError)
      .mockResolvedValueOnce(issuedRecord);
    mocks.removeStoredCertificatePdf.mockRejectedValueOnce(
      new Error("temporary blob delete failure"),
    );

    await expect(attemptIssuance()).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      cause: originalError,
    });
    await expect(attemptIssuance()).resolves.toMatchObject({
      certificateNumber: "CERT-2026-0001",
    });

    expect(mocks.reserveCertificateIssuance).toHaveBeenCalledTimes(2);
    expect(mocks.releaseCertificateIssuanceReservation).toHaveBeenCalledOnce();
  });

  it("releases the reservation when PDF generation fails before upload", async () => {
    const originalError = new Error("layout generation failed");
    mocks.generateCertificatePdf.mockRejectedValueOnce(originalError);

    await expect(attemptIssuance()).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      cause: originalError,
    });

    expect(mocks.storeCertificatePdf).not.toHaveBeenCalled();
    expect(mocks.releaseCertificateIssuanceReservation).toHaveBeenCalledOnce();
  });
});

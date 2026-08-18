import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  CertificatePdfLayoutError,
  generateCertificatePdf,
} from "@/lib/certificates/pdf-generator";
import { createCertificateSnapshot } from "@/lib/certificates/snapshot";
import {
  removeStoredCertificatePdf,
  storeCertificatePdf,
  type StoredCertificatePdf,
} from "@/lib/certificates/private-storage";
import {
  getCertificateRecordByRequestId,
  getIssuedCertificateRecordByRequestId,
  getProfileById,
  hasSuccessfulPayment,
  generateVerificationToken,
  persistIssuedCertificate,
  releaseCertificateIssuanceReservation,
  reserveCertificateIssuance,
} from "@/lib/db/queries";
import { sha256Hex } from "@/lib/security/document-hash";
import { env } from "@/lib/env";
import { issuanceMode } from "@/lib/services/issuance-mode";
import { isVerificationExpired } from "@/lib/certificates/certificate-status";
import type { RequestWithResident } from "@/lib/db/queries";
import type { CertificateRecord, Json } from "@/types/database";

export const VERIFICATION_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

export type CertificateIssuanceResult = {
  certificateNumber: string;
  certificateRecord: CertificateRecord;
  expiresAt: string;
  pdfBytes: Uint8Array;
  shortVerificationCode: string;
  verificationToken: string;
  verificationUrl: string;
};

export class CertificateIssuanceError extends Error {
  constructor(
    public readonly code:
      | "ALREADY_ISSUED"
      | "INVALID_ISSUER"
      | "NOT_ELIGIBLE"
      | "PAYMENT_NOT_SETTLED"
      | "LAYOUT_OVERFLOW"
      | "PERSISTENCE_FAILED",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CertificateIssuanceError";
  }
}

export function isCertificateIssuanceEligible(
  request: Pick<RequestWithResident, "status" | "payment_status">,
) {
  if (request.status !== "accepted") return false;
  return ["paid", "free"].includes(request.payment_status);
}

function getOfficialIssueDate(dateIssued: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIssued)) {
    throw new CertificateIssuanceError("NOT_ELIGIBLE", "The issue date is invalid.");
  }
  const parsed = new Date(`${dateIssued}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateIssued
  ) {
    throw new CertificateIssuanceError("NOT_ELIGIBLE", "The issue date is invalid.");
  }
  return dateIssued;
}

function getShortVerificationCode() {
  return `BB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function mapPersistenceError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "CERTIFICATE_ALREADY_ISSUED":
      return new CertificateIssuanceError(
        "ALREADY_ISSUED",
        "A certificate is already issued for this request.",
        { cause: error },
      );
    case "CERTIFICATE_ISSUER_NOT_AUTHORIZED":
      return new CertificateIssuanceError(
        "INVALID_ISSUER",
        "Only Main Admin or Barangay Secretary accounts can issue certificates.",
        { cause: error },
      );
    case "CERTIFICATE_PAYMENT_NOT_SETTLED":
      return new CertificateIssuanceError(
        "PAYMENT_NOT_SETTLED",
        "A successful payment record is required before issuing this certificate.",
        { cause: error },
      );
    case "CERTIFICATE_REQUEST_NOT_ELIGIBLE":
    case "CERTIFICATE_REQUEST_STATE_CHANGED":
      return new CertificateIssuanceError(
        "NOT_ELIGIBLE",
        "The request is no longer eligible for certificate issuance.",
        { cause: error },
      );
    case "CERTIFICATE_REQUEST_MISSING":
      return new CertificateIssuanceError(
        "PERSISTENCE_FAILED",
        "The certificate request could not be found while saving the certificate.",
        { cause: error },
      );
    default:
      return null;
  }
}

export async function issueCertificate(input: {
  dateIssued: string;
  /** Internal fixture clock only; never accept this from a request or form. */
  now?: Date;
  preparedBy: string;
  preparedById: string;
  request: RequestWithResident;
  settings: { barangayCaptainName: string };
}) {
  const { request } = input;

  const issuer = await getProfileById(input.preparedById);
  if (!issuer || !["main_admin", "barangay_secretary"].includes(issuer.role)) {
    throw new CertificateIssuanceError(
      "INVALID_ISSUER",
      "Only Main Admin or Barangay Secretary accounts can issue certificates.",
    );
  }

  if (
    request.payment_status === "paid" &&
    !(await hasSuccessfulPayment(request.id, request.resident_id))
  ) {
    throw new CertificateIssuanceError(
      "PAYMENT_NOT_SETTLED",
      "A successful payment record is required before issuing this certificate.",
    );
  }

  const previousRecord = await getCertificateRecordByRequestId(request.id);
  const isReissue = previousRecord?.status === "revoked";
  const canReissue =
    isReissue &&
    ["paid", "free"].includes(request.payment_status) &&
    ["accepted", "ready_for_download", "done"].includes(request.status);

  if (await getIssuedCertificateRecordByRequestId(request.id)) {
    throw new CertificateIssuanceError(
      "ALREADY_ISSUED",
      "A certificate is already issued for this request.",
    );
  }

  if (!isCertificateIssuanceEligible(request) && !canReissue) {
    throw new CertificateIssuanceError(
      "NOT_ELIGIBLE",
      "Only accepted paid or free requests can be issued.",
    );
  }

  const dateIssued = getOfficialIssueDate(input.dateIssued);
  const issuanceClock = input.now ?? new Date();
  if (Number.isNaN(issuanceClock.getTime())) {
    throw new CertificateIssuanceError("NOT_ELIGIBLE", "The issue time is invalid.");
  }
  const issuedAt = issuanceClock.toISOString();
  const expiresAt = new Date(
    issuanceClock.getTime() + VERIFICATION_LIFETIME_MS,
  ).toISOString();
  const verificationStatus = isVerificationExpired(expiresAt) ? "expired" : "valid";
  const certificateRecordId = randomUUID();
  let certificateNumber: string;
  try {
    certificateNumber = await reserveCertificateIssuance({
      certificate_record_id: certificateRecordId,
      request_id: request.id,
      reserved_by: input.preparedById,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CERTIFICATE_ISSUANCE_IN_PROGRESS") {
      throw new CertificateIssuanceError(
        "PERSISTENCE_FAILED",
        "Another certificate issuance attempt is already in progress for this request.",
        { cause: error },
      );
    }
    if (error instanceof Error && error.message === "CERTIFICATE_ALREADY_ISSUED") {
      throw new CertificateIssuanceError(
        "ALREADY_ISSUED",
        "A certificate is already issued for this request.",
        { cause: error },
      );
    }
    throw new CertificateIssuanceError(
      "PERSISTENCE_FAILED",
      "Certificate issuance could not be started.",
      { cause: error },
    );
  }
  const verificationToken = generateVerificationToken();
  const shortVerificationCode = getShortVerificationCode();
  const tokenHash = createHash("sha256").update(verificationToken).digest("hex");
  const verificationUrl = `${env.appUrl.replace(/\/$/, "")}/verify/${verificationToken}`;
  const snapshot = createCertificateSnapshot({
    authorizedOfficialName: input.settings.barangayCaptainName,
    certificateNumber,
    dateIssued,
    issuedAt,
    issuanceMode: issuanceMode,
    preparedBy: input.preparedBy,
    request,
    verificationExpiresAt: expiresAt,
  });
  const templateData: Json = {
    certificate_snapshot_version: 1,
    certificate_number: certificateNumber,
    generated_at: new Date().toISOString(),
    request_number: request.request_number,
    signature_notice:
      "The displayed signer is a visual placeholder, not a legally verified digital signature.",
  };

  let storedPdf: StoredCertificatePdf | null = null;
  try {
    const pdfBytes = await generateCertificatePdf({
      barangayCaptainName: input.settings.barangayCaptainName,
      certificateNumber,
      dateIssued,
      preparedBy: input.preparedBy,
      request,
      snapshot,
      verificationCode: shortVerificationCode,
      verificationExpiresAt: expiresAt,
      verificationUrl,
    });

    storedPdf = await storeCertificatePdf(certificateRecordId, pdfBytes);
    const certificateRecord = await persistIssuedCertificate({
      certificate_number: certificateNumber,
      certificate_record_id: certificateRecordId,
      current_request_status: request.status,
      date_issued: dateIssued,
      issued_at: issuedAt,
      issuance_mode: issuanceMode,
      next_request_status: "ready_for_download",
      pdf_path: storedPdf.path,
      pdf_storage_key: storedPdf.key,
      pdf_storage_provider: storedPdf.provider,
      pdf_sha256: sha256Hex(pdfBytes),
      prepared_by: input.preparedById,
      request,
      short_verification_code: shortVerificationCode,
      template_data: templateData,
      certificate_snapshot: snapshot,
      token_hash: tokenHash,
      verification_expires_at: expiresAt,
      verification_status: verificationStatus,
    });

    if (!certificateRecord) {
      throw new CertificateIssuanceError(
        "PERSISTENCE_FAILED",
        "The issued certificate record could not be loaded.",
      );
    }

    return {
      certificateNumber,
      certificateRecord,
      expiresAt,
      pdfBytes,
      shortVerificationCode,
      verificationToken,
      verificationUrl,
    } satisfies CertificateIssuanceResult;
  } catch (error) {
    // Cleanup must never replace the original issuance error. Blob deletion is
    // best effort, but releasing the reservation must still be attempted so a
    // later request can retry after a transient storage or database failure.
    try {
      if (storedPdf) {
        await removeStoredCertificatePdf(storedPdf);
      }
    } catch {
      // The uploaded artifact may be cleaned up by a later retention job.
    } finally {
      try {
        await releaseCertificateIssuanceReservation(certificateRecordId);
      } catch {
        // Preserve the original issuance error; operators can reconcile a
        // release failure from the reservation state and database logs.
      }
    }

    if (error instanceof CertificateIssuanceError) {
      throw error;
    }

    if (error instanceof CertificatePdfLayoutError) {
      throw new CertificateIssuanceError("LAYOUT_OVERFLOW", error.message, {
        cause: error,
      });
    }

    const mappedError = mapPersistenceError(error);
    if (mappedError) {
      throw mappedError;
    }

    throw new CertificateIssuanceError(
      "PERSISTENCE_FAILED",
      "Certificate issuance could not be completed.",
      { cause: error },
    );
  }
}

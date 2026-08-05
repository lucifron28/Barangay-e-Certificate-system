import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { generateCertificatePdf } from "@/lib/certificates/pdf-generator";
import {
  removePrivateCertificatePdf,
  savePrivateCertificatePdf,
} from "@/lib/certificates/private-storage";
import {
  allocateCertificateNumber,
  getCertificateRecordByRequestId,
  getIssuedCertificateRecordByRequestId,
  generateVerificationToken,
  persistIssuedCertificate,
} from "@/lib/db/sqlite/queries";
import { sha256Hex } from "@/lib/security/document-hash";
import { env } from "@/lib/env";
import { issuanceMode } from "@/lib/services/issuance-mode";
import type { RequestWithResident } from "@/lib/db/sqlite/queries";
import type { CertificateRecord, Json } from "@/types/database";

const VERIFICATION_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000;

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
      | "NOT_ELIGIBLE"
      | "PERSISTENCE_FAILED",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CertificateIssuanceError";
  }
}

export function isCertificateIssuanceEligible(request: Pick<RequestWithResident, "status" | "payment_status">) {
  return request.status === "accepted" && ["paid", "free"].includes(request.payment_status);
}

function getIssuedAt(dateIssued: string) {
  const issuedAt = new Date(`${dateIssued}T00:00:00.000Z`);
  if (Number.isNaN(issuedAt.getTime())) {
    throw new CertificateIssuanceError("NOT_ELIGIBLE", "The issue date is invalid.");
  }
  return issuedAt.toISOString();
}

function getShortVerificationCode() {
  return `BB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function issueCertificate(input: {
  dateIssued: string;
  preparedBy: string;
  preparedById: string;
  request: RequestWithResident;
  settings: { barangayCaptainName: string };
}) {
  const { request } = input;

  const previousRecord = getCertificateRecordByRequestId(request.id);
  const isReissue = previousRecord?.status === "revoked";
  const canReissue =
    isReissue &&
    ["paid", "free"].includes(request.payment_status) &&
    ["accepted", "ready_for_download", "done"].includes(request.status);

  if (getIssuedCertificateRecordByRequestId(request.id)) {
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

  const issuedAt = getIssuedAt(input.dateIssued);
  const expiresAt = new Date(
    new Date(issuedAt).getTime() + VERIFICATION_LIFETIME_MS,
  ).toISOString();
  const certificateNumber = allocateCertificateNumber();
  const certificateRecordId = randomUUID();
  const verificationToken = generateVerificationToken();
  const shortVerificationCode = getShortVerificationCode();
  const tokenHash = createHash("sha256").update(verificationToken).digest("hex");
  const verificationUrl = `${env.appUrl.replace(/\/$/, "")}/verify/${verificationToken}`;
  const templateData: Json = {
    certificate_number: certificateNumber,
    generated_at: new Date().toISOString(),
    request_number: request.request_number,
    signature_notice:
      "The displayed signer is a visual thesis/demo representation, not a cryptographic digital signature.",
  };

  let pdfPath: string | null = null;
  try {
    const pdfBytes = await generateCertificatePdf({
      barangayCaptainName: input.settings.barangayCaptainName,
      certificateNumber,
      dateIssued: issuedAt,
      preparedBy: input.preparedBy,
      request,
      verificationCode: shortVerificationCode,
      verificationExpiresAt: expiresAt,
      verificationUrl,
    });

    pdfPath = savePrivateCertificatePdf(certificateRecordId, pdfBytes);
    const certificateRecord = persistIssuedCertificate({
      certificate_number: certificateNumber,
      certificate_record_id: certificateRecordId,
      current_request_status: request.status,
      date_issued: input.dateIssued,
      issued_at: issuedAt,
      issuance_mode: issuanceMode,
      next_request_status:
        issuanceMode === "fully_online_demo"
          ? "ready_for_download"
          : request.pickup_schedules.length
            ? "ready_for_pickup"
            : request.status,
      pdf_path: pdfPath,
      pdf_sha256: sha256Hex(pdfBytes),
      prepared_by: input.preparedById,
      request,
      short_verification_code: shortVerificationCode,
      template_data: templateData,
      token_hash: tokenHash,
      verification_expires_at: expiresAt,
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
    if (pdfPath) {
      removePrivateCertificatePdf(pdfPath);
    }

    if (error instanceof CertificateIssuanceError) {
      throw error;
    }

    throw new CertificateIssuanceError(
      "PERSISTENCE_FAILED",
      "Certificate issuance could not be completed.",
      { cause: error },
    );
  }
}

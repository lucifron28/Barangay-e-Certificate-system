import { isVerificationExpired } from "@/lib/certificates/certificate-status";
import type { CertificateRecord } from "@/types/database";

export const CERTIFICATE_DOWNLOAD_RESULTS = [
  "downloaded",
  "denied_owner_mismatch",
  "denied_expired",
  "denied_revoked",
  "denied_missing_artifact",
  "integrity_failure",
  "denied_not_issued",
] as const;

export type CertificateDownloadResult =
  (typeof CERTIFICATE_DOWNLOAD_RESULTS)[number];

export function getCertificateDownloadDenial(input: {
  artifactExists: boolean;
  integrityChecked?: boolean;
  integrityValid?: boolean;
  now?: Date | number;
  record: CertificateRecord | null;
  residentId: string;
}) {
  const { record } = input;
  if (!record || record.resident_id !== input.residentId) {
    return "denied_owner_mismatch" as const;
  }
  if (record.status === "revoked") return "denied_revoked" as const;
  if (record.status !== "issued") return "denied_not_issued" as const;
  if (!record.verification_expires_at || isVerificationExpired(record.verification_expires_at, input.now)) {
    return "denied_expired" as const;
  }
  if (
    (!record.pdf_path && !record.pdf_storage_key) ||
    !record.pdf_sha256 ||
    !input.artifactExists
  ) {
    return "denied_missing_artifact" as const;
  }
  if (input.integrityChecked && input.integrityValid === false) {
    return "integrity_failure" as const;
  }
  return null;
}

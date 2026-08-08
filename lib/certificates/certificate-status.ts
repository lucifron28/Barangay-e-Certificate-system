import type { CertificateRecord } from "@/types/database";

export const CERTIFICATE_DISPLAY_STATUS_LABELS = {
  valid: "Valid",
  expired: "Expired",
  revoked: "Revoked",
  replaced: "Replaced",
} as const;

export type CertificateDisplayStatus = keyof typeof CERTIFICATE_DISPLAY_STATUS_LABELS;

export function getCertificateDisplayStatus(
  record: Pick<
    CertificateRecord,
    "replacement_record_id" | "status" | "verification_expires_at"
  >,
  now = Date.now(),
): CertificateDisplayStatus {
  if (record.replacement_record_id) return "replaced";
  if (record.status === "revoked") return "revoked";
  if (
    record.status === "expired" ||
    !record.verification_expires_at ||
    new Date(record.verification_expires_at).getTime() <= now
  ) {
    return "expired";
  }
  return "valid";
}

export function certificateStatusBadgeClass(status: CertificateDisplayStatus) {
  switch (status) {
    case "valid":
      return "badge-success";
    case "expired":
      return "badge-warning";
    case "replaced":
      return "badge-info";
    case "revoked":
      return "badge-error";
  }
}

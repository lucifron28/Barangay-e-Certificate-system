import { certificateHasField } from "@/lib/services/certificate-fields";
import type { CertificateRequest, CertificateSnapshot, Json } from "@/types/database";

type SubmittedData = {
  common?: {
    address_sitio?: string | null;
    age?: number | null;
    contact_number?: string | null;
    full_name?: string | null;
    purpose?: string | null;
  };
  certificate_specific?: {
    birthdate?: string | null;
    place_of_birth?: string | null;
    years_of_residency?: number | null;
  };
};

function asSubmittedData(value: Json): SubmittedData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as SubmittedData;
}

function textOrNull(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function createCertificateSnapshot(input: {
  authorizedOfficialName: string;
  certificateNumber: string;
  dateIssued: string;
  issuedAt: string;
  issuanceMode: CertificateSnapshot["issuance_mode"];
  preparedBy: string;
  request: Pick<
    CertificateRequest,
    | "certificate_type"
    | "control_number"
    | "purpose"
    | "request_number"
    | "submitted_data"
  >;
  verificationExpiresAt: string;
}): CertificateSnapshot {
  const submitted = asSubmittedData(input.request.submitted_data);
  const common = submitted.common ?? {};
  const specific = submitted.certificate_specific ?? {};

  return {
    authorized_official_display_name: input.authorizedOfficialName,
    certificate_number: input.certificateNumber,
    certificate_type: input.request.certificate_type,
    control_number: input.request.control_number,
    date_issued: input.dateIssued,
    holder_address_sitio: certificateHasField(input.request.certificate_type, "sitio")
      ? textOrNull(common.address_sitio)
      : null,
    holder_age: numberOrNull(common.age),
    holder_birthdate: textOrNull(specific.birthdate),
    holder_contact_number: textOrNull(common.contact_number),
    holder_full_name: textOrNull(common.full_name) ?? "",
    holder_place_of_birth: textOrNull(specific.place_of_birth),
    holder_years_of_residency: numberOrNull(specific.years_of_residency),
    issued_at: input.issuedAt,
    issuance_mode: input.issuanceMode,
    prepared_by_display_name: input.preparedBy,
    purpose: textOrNull(common.purpose) ?? input.request.purpose,
    request_number: input.request.request_number,
    signature_representation_type: "visual_name_placeholder",
    verification_expires_at: input.verificationExpiresAt,
  };
}

import { formatDate } from "@/lib/utils/format";
import type { CertificateRequest, Json, Profile } from "@/types/database";

export type CertificateRequestWithResident = CertificateRequest & {
  resident: Pick<
    Profile,
    "address_sitio" | "age" | "date_of_birth" | "full_name"
  > | null;
};

type SubmittedData = {
  common?: {
    address_sitio?: string;
    age?: number;
    full_name?: string;
    purpose?: string;
  };
  certificate_specific?: {
    birthdate?: string | null;
    place_of_birth?: string | null;
    years_of_residency?: number | null;
  };
};

export type CertificateTemplateData = {
  address: string;
  age: string;
  birthDetails: string;
  birthday: string;
  controlNumber: string;
  dateIssued: string;
  name: string;
  purpose: string;
  requestNumber: string;
  yearsOfResidency: string;
};

function asSubmittedData(value: Json): SubmittedData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as SubmittedData;
}

function fieldOrLine(value: string | number | null | undefined) {
  return value ? String(value) : "________________";
}

export function getCertificateTemplateData(
  request: CertificateRequestWithResident,
): CertificateTemplateData {
  const submittedData = asSubmittedData(request.submitted_data);
  const resident = request.resident;

  return {
    address: fieldOrLine(
      submittedData.common?.address_sitio ?? resident?.address_sitio,
    ),
    age: fieldOrLine(submittedData.common?.age ?? resident?.age),
    birthDetails: fieldOrLine(
      submittedData.certificate_specific?.place_of_birth,
    ),
    birthday: fieldOrLine(
      submittedData.certificate_specific?.birthdate ?? resident?.date_of_birth,
    ),
    controlNumber: request.control_number ?? "Pending",
    dateIssued: formatDate(new Date().toISOString()),
    name: fieldOrLine(submittedData.common?.full_name ?? resident?.full_name),
    purpose: fieldOrLine(submittedData.common?.purpose ?? request.purpose),
    requestNumber: request.request_number,
    yearsOfResidency: fieldOrLine(
      submittedData.certificate_specific?.years_of_residency,
    ),
  };
}

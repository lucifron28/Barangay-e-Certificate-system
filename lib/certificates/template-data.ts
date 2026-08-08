import { formatDate } from "@/lib/utils/format";
import { certificateHasField } from "@/lib/services/certificate-fields";
import type {
  CertificateRequest,
  CertificateSnapshot,
  Json,
  Profile,
} from "@/types/database";

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
  locality: string;
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
  dateIssued = new Date().toISOString(),
  snapshot?: CertificateSnapshot,
): CertificateTemplateData {
  const submittedData = asSubmittedData(request.submitted_data);
  const resident = request.resident;
  const locality = "Barangay Bato, Mauban, Quezon";
  const addressFromRequest = snapshot
    ? snapshot.holder_address_sitio
    : submittedData.common?.address_sitio ?? resident?.address_sitio;
  const address = certificateHasField(request.certificate_type, "sitio")
    ? fieldOrLine(snapshot?.holder_address_sitio ?? addressFromRequest)
    : "Barangay Bato";

  const age = snapshot
    ? snapshot.holder_age
    : submittedData.common?.age ?? resident?.age;
  const birthDetails = snapshot
    ? snapshot.holder_place_of_birth
    : submittedData.certificate_specific?.place_of_birth;
  const birthday = snapshot
    ? snapshot.holder_birthdate
    : submittedData.certificate_specific?.birthdate ?? resident?.date_of_birth;
  const name = snapshot
    ? snapshot.holder_full_name
    : submittedData.common?.full_name ?? resident?.full_name;
  const purpose = snapshot
    ? snapshot.purpose
    : submittedData.common?.purpose ?? request.purpose;
  const yearsOfResidency = snapshot
    ? snapshot.holder_years_of_residency
    : submittedData.certificate_specific?.years_of_residency;

  return {
    address,
    age: fieldOrLine(age),
    birthDetails: fieldOrLine(birthDetails),
    birthday: fieldOrLine(birthday),
    controlNumber: snapshot ? snapshot.control_number ?? "Pending" : request.control_number ?? "Pending",
    dateIssued: formatDate(snapshot?.date_issued ?? dateIssued),
    name: fieldOrLine(name),
    locality,
    purpose: fieldOrLine(purpose),
    requestNumber: snapshot?.request_number ?? request.request_number,
    yearsOfResidency: fieldOrLine(yearsOfResidency),
  };
}

import type { CertificateRequest, Json } from "@/types/database";
import type { CertificateType } from "@/types/enums";

type SubmittedData = {
  certificate_specific?: {
    birthdate?: string | null;
    place_of_birth?: string | null;
    years_of_residency?: number | null;
  };
  common?: {
    address_sitio?: string | null;
    age?: number | null;
    contact_number?: string | null;
    full_name?: string | null;
    purpose?: string | null;
  };
};

export type SubmittedInformation = {
  label: string;
  value: string;
};

function asSubmittedData(value: Json): SubmittedData {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SubmittedData)
    : {};
}

function add(fields: SubmittedInformation[], label: string, value: unknown) {
  if (value !== null && value !== undefined && String(value).trim()) {
    fields.push({ label, value: String(value) });
  }
}

export function getSubmittedInformation(request: Pick<CertificateRequest, "certificate_type" | "submitted_data">) {
  const data = asSubmittedData(request.submitted_data);
  const common = data.common ?? {};
  const specific = data.certificate_specific ?? {};
  const fields: SubmittedInformation[] = [];

  add(fields, "Full name", common.full_name);
  add(fields, "Age", common.age);
  if (usesSitio(request.certificate_type)) add(fields, "Sitio", common.address_sitio);
  add(fields, "Contact number", common.contact_number);

  if (request.certificate_type === "barangay_certificate") {
    add(fields, "Place of birth", specific.place_of_birth);
  }
  if (request.certificate_type === "barangay_residency") {
    add(fields, "Birthdate", specific.birthdate);
    add(fields, "Years of residency", specific.years_of_residency);
  }
  add(fields, "Purpose", common.purpose);
  return fields;
}

export function usesSitio(certificateType: CertificateType) {
  return certificateType !== "barangay_certificate";
}

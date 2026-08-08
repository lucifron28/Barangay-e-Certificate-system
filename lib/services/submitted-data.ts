import type { CertificateRequest, Json } from "@/types/database";
import type { CertificateType } from "@/types/enums";
import {
  certificateHasField,
  getCertificateFieldRequirements,
} from "@/lib/services/certificate-fields";

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

  for (const requirement of getCertificateFieldRequirements(request.certificate_type)) {
    const value = {
      age: common.age,
      birthdate: specific.birthdate,
      contact_number: common.contact_number,
      full_name: common.full_name,
      place_of_birth: specific.place_of_birth,
      purpose: common.purpose,
      sitio: common.address_sitio,
      years_of_residency: specific.years_of_residency,
    }[requirement.name];
    add(fields, requirement.label, value);
  }
  return fields;
}

export function usesSitio(certificateType: CertificateType) {
  return certificateHasField(certificateType, "sitio");
}

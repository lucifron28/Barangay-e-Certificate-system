import type { CertificateType } from "@/types/enums";

export const CERTIFICATE_FIELD_NAMES = [
  "full_name",
  "age",
  "sitio",
  "contact_number",
  "purpose",
  "place_of_birth",
  "birthdate",
  "years_of_residency",
] as const;

export type CertificateFieldName = (typeof CERTIFICATE_FIELD_NAMES)[number];

export type CertificateFieldRequirement = {
  label: string;
  name: CertificateFieldName;
};

const field = (name: CertificateFieldName, label: string): CertificateFieldRequirement => ({
  label,
  name,
});

export const CERTIFICATE_FIELD_REQUIREMENTS: Record<
  CertificateType,
  readonly CertificateFieldRequirement[]
> = {
  barangay_clearance: [
    field("full_name", "Full name"),
    field("age", "Age"),
    field("sitio", "Sitio"),
    field("contact_number", "Contact number"),
    field("purpose", "Purpose"),
  ],
  barangay_certificate: [
    field("full_name", "Full name"),
    field("age", "Age"),
    field("contact_number", "Contact number"),
    field("place_of_birth", "Place of birth"),
    field("purpose", "Purpose"),
  ],
  barangay_indigency: [
    field("full_name", "Full name"),
    field("age", "Age"),
    field("sitio", "Sitio"),
    field("contact_number", "Contact number"),
    field("purpose", "Purpose"),
  ],
  barangay_residency: [
    field("full_name", "Full name"),
    field("age", "Age"),
    field("sitio", "Sitio"),
    field("contact_number", "Contact number"),
    field("birthdate", "Birthdate"),
    field("years_of_residency", "Years of residency"),
    field("purpose", "Purpose"),
  ],
};

export function getCertificateFieldRequirements(certificateType: CertificateType) {
  return CERTIFICATE_FIELD_REQUIREMENTS[certificateType];
}

export function certificateHasField(
  certificateType: CertificateType,
  fieldName: CertificateFieldName,
) {
  return getCertificateFieldRequirements(certificateType).some(
    (requirement) => requirement.name === fieldName,
  );
}

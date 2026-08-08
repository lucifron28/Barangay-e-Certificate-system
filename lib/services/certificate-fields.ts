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
  message: string;
  name: CertificateFieldName;
};

const field = (
  name: CertificateFieldName,
  label: string,
  message: string,
): CertificateFieldRequirement => ({
  label,
  message,
  name,
});

export const CERTIFICATE_FIELD_REQUIREMENTS: Record<
  CertificateType,
  readonly CertificateFieldRequirement[]
> = {
  barangay_clearance: [
    field("full_name", "Full name", "Full name is required."),
    field("age", "Age", "Age is required."),
    field("sitio", "Sitio", "Address or sitio is required for this certificate."),
    field("contact_number", "Contact number", "Contact number is required."),
    field("purpose", "Purpose", "Purpose is required."),
  ],
  barangay_certificate: [
    field("full_name", "Full name", "Full name is required."),
    field("age", "Age", "Age is required."),
    field("contact_number", "Contact number", "Contact number is required."),
    field("place_of_birth", "Place of birth", "Place of birth is required for Barangay Certificate."),
    field("purpose", "Purpose", "Purpose is required."),
  ],
  barangay_indigency: [
    field("full_name", "Full name", "Full name is required."),
    field("age", "Age", "Age is required."),
    field("sitio", "Sitio", "Address or sitio is required for this certificate."),
    field("contact_number", "Contact number", "Contact number is required."),
    field("purpose", "Purpose", "Purpose is required."),
  ],
  barangay_residency: [
    field("full_name", "Full name", "Full name is required."),
    field("age", "Age", "Age is required."),
    field("sitio", "Sitio", "Address or sitio is required for this certificate."),
    field("contact_number", "Contact number", "Contact number is required."),
    field("birthdate", "Birthdate", "Birthdate is required for Barangay Residency."),
    field("years_of_residency", "Years of residency", "Years of residency is required for Barangay Residency."),
    field("purpose", "Purpose", "Purpose is required."),
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

import type { CertificateType } from "@/types/enums";

export const CERTIFICATE_TEMPLATE_TITLES: Record<CertificateType, string> = {
  barangay_clearance: "CERTIFICATION OF CLEARANCE",
  barangay_certificate: "PAGPAPATUNAY",
  barangay_indigency: "CERTIFICATION OF INDIGENCY",
  barangay_residency: "CERTIFICATION OF RESIDENCY",
};

export const CERTIFICATE_TEMPLATE_SALUTATIONS: Record<CertificateType, string> =
  {
    barangay_clearance: "To whom it may concern:",
    barangay_certificate: "Sa kinauukulan:",
    barangay_indigency: "To Whom it may concern,",
    barangay_residency: "To Whom it may concern,",
  };

export const CERTIFICATE_TEMPLATE_SIGNATURE_ROLES: Record<CertificateType, string> =
  {
    barangay_clearance: "Barangay Chairman",
    barangay_certificate: "Punong Barangay",
    barangay_indigency: "Barangay Chairman",
    barangay_residency: "Barangay Chairman",
  };

export function certificateTemplateTitle(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_TITLES[certificateType];
}

export function certificateTemplateSalutation(
  certificateType: CertificateType,
) {
  return CERTIFICATE_TEMPLATE_SALUTATIONS[certificateType];
}

export function certificateTemplateSignatureRole(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_SIGNATURE_ROLES[certificateType];
}

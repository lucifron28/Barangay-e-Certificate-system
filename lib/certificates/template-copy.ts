import type { CertificateType } from "@/types/enums";

export const CERTIFICATE_TEMPLATE_TITLES: Record<CertificateType, string> = {
  barangay_clearance: "CERTIFICATION OF BARANGAY CLEARANCE",
  barangay_certificate: "PAGPAPATUNAY",
  barangay_indigency: "CERTIFICATION OF THE BARANGAY OF INDIGENCY",
  barangay_residency: "CERTIFICATION OF THE BARANGAY OF RESIDENCY",
};

export const CERTIFICATE_TEMPLATE_SALUTATIONS: Record<CertificateType, string> = {
  barangay_clearance: "To whom it may concern:",
  barangay_certificate: "Sa kinauukulan:",
  barangay_indigency: "To whom it may concern:",
  barangay_residency: "To whom it may concern:",
};

export function certificateTemplateTitle(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_TITLES[certificateType];
}

export function certificateTemplateSalutation(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_SALUTATIONS[certificateType];
}

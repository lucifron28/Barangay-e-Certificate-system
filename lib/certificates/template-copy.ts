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
    barangay_certificate: "PUNONG BARANGAY",
    barangay_indigency: "Barangay Chairman",
    barangay_residency: "Barangay Chairman",
  };

export const CERTIFICATE_TEMPLATE_SIGNATURE_LABELS: Record<CertificateType, string> =
  {
    barangay_clearance: "Certified by:",
    barangay_certificate: "Pinatunayan ni:",
    barangay_indigency: "Certified by:",
    barangay_residency: "Certified by:",
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

export function certificateTemplateSignatureLabel(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_SIGNATURE_LABELS[certificateType];
}

export const CERTIFICATE_TEMPLATE_OFFICE_TITLES: Record<CertificateType, string> =
  {
    barangay_clearance: "OFFICE OF THE BARANGAY CHAIRMAN",
    barangay_certificate: "TANGGAPAN NG PUNONG BARANGAY",
    barangay_indigency: "OFFICE OF THE BARANGAY CHAIRMAN",
    barangay_residency: "OFFICE OF THE BARANGAY CHAIRMAN",
  };

export const CERTIFICATE_TEMPLATE_HEADER_LINES: Record<
  CertificateType,
  readonly string[]
> = {
  barangay_clearance: [
    "Republic of the Philippines",
    "Province of Quezon",
    "Municipality of Mauban",
    "Barangay BATO",
  ],
  barangay_certificate: [
    "Republic of the Philippines",
    "Municipality of Mauban",
    "Province of Quezon",
    "Barangay BATO",
  ],
  barangay_indigency: [
    "Republic of the Philippines",
    "Municipality of Mauban",
    "Province of Quezon",
    "Barangay BATO",
  ],
  barangay_residency: [
    "Republic of the Philippines",
    "Municipality of Mauban",
    "Province of Quezon",
    "Barangay BATO",
  ],
};

export function certificateTemplateOfficeTitle(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_OFFICE_TITLES[certificateType];
}

export function certificateTemplateHeaderLines(certificateType: CertificateType) {
  return CERTIFICATE_TEMPLATE_HEADER_LINES[certificateType];
}

export function formatResidentLocality(address: string) {
  const value = address.trim();
  const normalized = value.toLowerCase();
  const parts = value ? [value] : [];
  if (!normalized.includes("barangay bato")) parts.push("Barangay Bato");
  if (!normalized.includes("mauban")) parts.push("Mauban");
  if (!normalized.includes("quezon")) parts.push("Quezon");
  return parts.join(", ");
}

export type CertificateContentRun = {
  bold?: boolean;
  text: string;
};

export type CertificateBodyContent = {
  issue: CertificateContentRun[];
  paragraphs: CertificateContentRun[][];
};

export function buildCertificateBodyContent(
  type: CertificateType,
  data: {
    address: string;
    age: string;
    birthDetails: string;
    birthday: string;
    dateIssued: string;
    name: string;
    purpose: string;
    yearsOfResidency: string;
  },
): CertificateBodyContent {
  const residentLocality = formatResidentLocality(data.address);
  const regular = (text: string): CertificateContentRun => ({ text });
  const bold = (text: string): CertificateContentRun => ({ bold: true, text });

  switch (type) {
    case "barangay_clearance":
      return {
        issue: [
          regular(
            `Issued upon request of the interested party this ${data.dateIssued} at the Office of the Sangguniang Barangay of Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(
              `, ${data.age} years old whose signature appears below is a bona fide resident of `,
            ),
            bold(residentLocality),
            regular(
              " and personally known to be a person of good moral character and has no criminal record in this office.",
            ),
          ],
          [
            regular(
              "This Certification is being issued in connection to his/her ",
            ),
            bold(data.purpose),
            regular(" and for whatever legal purpose it may serve."),
          ],
        ],
      };
    case "barangay_certificate":
      return {
        issue: [
          regular(
            `Ipinagkaloob ngayong ${data.dateIssued} sa tanggapan ng Punong Barangay ng Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("Pinatutunayan ng tanggapan na ito na si "),
            bold(data.name),
            regular(", "),
            bold(data.age),
            regular(" taong gulang, ay ipinanganak sa "),
            bold(data.birthDetails),
            regular(" at lehitimong naninirahan sa "),
            bold(residentLocality),
            regular("."),
          ],
          [
            regular(
              "Ang pagpapatunay na ito ay ipinagkakaloob sa kahilingan ng nasabing tao para sa layuning ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
    case "barangay_indigency":
      return {
        issue: [
          regular(
            `This certification is being issued this ${data.dateIssued} for whatever legal purpose it may serve.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(`, ${data.age} years old, is a bona fide resident of `),
            bold(residentLocality),
            regular("."),
          ],
          [
            regular(
              "This certifies that the above-named person belongs to an indigent family of the barangay and needs this certification for ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
    case "barangay_residency":
      return {
        issue: [
          regular(
            `Issued this ${data.dateIssued} at Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(", "),
            bold(data.age),
            regular(" years old born on "),
            bold(data.birthday),
            regular(" is a bona fide resident of "),
            bold(residentLocality),
            regular(" and has been residing in the barangay for "),
            bold(data.yearsOfResidency),
            regular(" year(s) up to present."),
          ],
          [
            regular(
              "This undersigned has certified that after a reasonable inquiry, I have verified the authenticity of Barangay residency showing that the applicant has been residing in the barangay for at least six (6) months prior to the application of this Affidavit of Residency.",
            ),
          ],
          [
            regular(
              "This Certification is issued upon the request of the above named person as a supporting document for ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
  }
}


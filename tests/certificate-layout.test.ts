import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  calculateCertificateBodyLayout,
  CERTIFICATE_LAYOUT_REGIONS,
  generateCertificatePdf,
} from "@/lib/certificates/pdf-generator";
import { getCertificateTemplateData } from "@/lib/certificates/template-data";
import {
  certificateTemplateSalutation,
  certificateTemplateTitle,
} from "@/lib/certificates/template-copy";
import { getRequestById } from "@/lib/db/sqlite/queries";
import type { CertificateType } from "@/types/enums";

const templateCases: Array<{
  type: CertificateType;
  title: string;
  salutation: string;
  specific: Record<string, string | number>;
}> = [
  {
    type: "barangay_clearance",
    title: "CERTIFICATION OF CLEARANCE",
    salutation: "To whom it may concern:",
    specific: {},
  },
  {
    type: "barangay_certificate",
    title: "PAGPAPATUNAY",
    salutation: "Sa kinauukulan:",
    specific: { place_of_birth: "Mauban, Quezon" },
  },
  {
    type: "barangay_indigency",
    title: "CERTIFICATION OF INDIGENCY",
    salutation: "To Whom it may concern,",
    specific: {},
  },
  {
    type: "barangay_residency",
    title: "CERTIFICATION OF RESIDENCY",
    salutation: "To Whom it may concern,",
    specific: { birthdate: "1998-04-12", years_of_residency: 8 },
  },
];

describe("certificate template parity", () => {
  it.each(templateCases)(
    "renders the $type template on the shared letter-size PDF layout",
    async ({ type, title, salutation, specific }) => {
      const source = getRequestById("10000000-0000-4000-8000-000000000004");
      expect(source).not.toBeNull();

      const request = {
        ...source!,
        certificate_type: type,
        purpose: "Thesis certificate layout review",
        submitted_data: {
          common: {
            full_name: "Maria Demo Resident",
            age: 28,
            address_sitio: "Sitio Centro",
            contact_number: "09170000002",
            purpose: "Thesis certificate layout review",
          },
          certificate_specific: specific,
        },
      };
      const templateData = getCertificateTemplateData(request);

      expect(certificateTemplateTitle(type)).toBe(title);
      expect(certificateTemplateSalutation(type)).toBe(salutation);
      expect(templateData.name).toBe("Maria Demo Resident");
      expect(templateData.purpose).toBe("Thesis certificate layout review");

      const bytes = await generateCertificatePdf({
        barangayCaptainName: "Authorized Barangay Official",
        certificateNumber: `CERT-LAYOUT-${type}`,
        dateIssued: "2026-08-08T04:00:00.000Z",
        preparedBy: "Demo Main Admin",
        request,
        verificationCode: `LAYOUT-${type}`,
        verificationExpiresAt: "2026-08-11T04:00:00.000Z",
        verificationUrl: `http://localhost:3000/verify/layout-${type}`,
      });
      const pdf = await PDFDocument.load(bytes);
      const [page] = pdf.getPages();

      expect(pdf.getPageCount()).toBe(1);
      expect(page.getWidth()).toBe(612);
      expect(page.getHeight()).toBe(792);
      expect(bytes.byteLength).toBeGreaterThan(4_000);
    },
  );

  it.each(templateCases)(
    "keeps long supported $type content above the signature region",
    async ({ type, specific }) => {
      const source = getRequestById("10000000-0000-4000-8000-000000000004");
      expect(source).not.toBeNull();
      const longPurpose = "Long thesis purpose for PDF layout validation "
        .repeat(4)
        .slice(0, 200)
        .padEnd(200, "X");
      expect(longPurpose).toHaveLength(200);
      const request = {
        ...source!,
        certificate_type: type,
        purpose: longPurpose,
        submitted_data: {
          common: {
            full_name:
              "A Very Long Resident Name For Certificate Layout Validation In Barangay Bato",
            age: 28,
            address_sitio:
              "Sitio Centro Extension and Riverside Community Area with Additional Address Detail",
            contact_number: "09170000002",
            purpose: longPurpose,
          },
          certificate_specific: {
            ...specific,
            place_of_birth:
              "Mauban, Quezon Province Municipal Health Office and Birth Registration Detail",
            birthdate: "1998-04-12",
            years_of_residency: 8,
          },
        },
      };

      const layout = await calculateCertificateBodyLayout({
        dateIssued: "2026-08-08",
        request,
      });
      expect(layout.paragraphGap).toBeLessThanOrEqual(16);
      if (type === "barangay_certificate") {
        expect([12, 9]).toContain(layout.paragraphGap);
      }
      expect(layout.endY).toBeGreaterThanOrEqual(
        CERTIFICATE_LAYOUT_REGIONS.bodyBottom,
      );

      const bytes = await generateCertificatePdf({
        barangayCaptainName: "Authorized Barangay Official",
        certificateNumber: `CERT-LONG-${type}`,
        dateIssued: "2026-08-08",
        preparedBy: "Demo Main Admin",
        request,
        verificationCode: `LONG-${type}`,
        verificationExpiresAt: "2026-08-11T04:00:00.000Z",
        verificationUrl: `http://localhost:3000/verify/long-${type}`,
      });
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
    },
  );
});

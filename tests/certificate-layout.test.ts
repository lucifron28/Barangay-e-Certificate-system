import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateCertificatePdf } from "@/lib/certificates/pdf-generator";
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
    title: "CERTIFICATION OF BARANGAY CLEARANCE",
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
    title: "CERTIFICATION OF THE BARANGAY OF INDIGENCY",
    salutation: "To whom it may concern:",
    specific: {},
  },
  {
    type: "barangay_residency",
    title: "CERTIFICATION OF THE BARANGAY OF RESIDENCY",
    salutation: "To whom it may concern:",
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
});

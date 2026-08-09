import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import {
  calculateHistoricalCertificateBodyLayout,
  generateHistoricalCertificatePdf,
  isHistoricalCertificateType,
  type HistoricalCertificateType,
} from "@/lib/certificates/historical-layout";
import { getRequestById } from "@/lib/db/sqlite/queries";
import { certificateTemplateTitle } from "@/lib/certificates/template-copy";

const syntheticName = "Alexis Example Santos";
const syntheticAddress = "Sample Street, Barangay Bato";
const syntheticPurpose = "Synthetic Purpose for Testing";

const cases: Array<{
  label: string;
  title: string;
  type: HistoricalCertificateType;
}> = [
  {
    label: "Barangay Residency",
    title: "CERTIFICATION OF RESIDENCY",
    type: "barangay_residency",
  },
  {
    label: "Barangay Clearance",
    title: "CERTIFICATION OF CLEARANCE",
    type: "barangay_clearance",
  },
  {
    label: "Barangay Indigency",
    title: "CERTIFICATION OF INDIGENCY",
    type: "barangay_indigency",
  },
];

function syntheticRequest(type: HistoricalCertificateType) {
  const source = getRequestById("10000000-0000-4000-8000-000000000004");
  expect(source).not.toBeNull();

  return {
    ...source!,
    certificate_type: type,
    request_number: "REQ-TEST-HIST-0001",
    purpose: syntheticPurpose,
    resident: {
      address_sitio: syntheticAddress,
      age: 39,
      date_of_birth: "1987-03-04",
      full_name: syntheticName,
    },
    submitted_data: {
      common: {
        address_sitio: syntheticAddress,
        age: 39,
        contact_number: "09000000000",
        full_name: syntheticName,
        purpose: syntheticPurpose,
      },
      certificate_specific:
        type === "barangay_residency"
          ? { birthdate: "1987-03-04", years_of_residency: 12 }
          : {},
    },
  };
}

describe("historical certificate template alignment", () => {
  it.each(cases)(
    "generates a valid $type PDF with digital metadata",
    async ({ label, title, type }) => {
      const request = syntheticRequest(type);
      const bytes = await generateHistoricalCertificatePdf({
        barangayCaptainName: "Synthetic Barangay Chairman",
        certificateNumber: `CERT-TEST-${type}`,
        dateIssued: "2026-08-09",
        preparedBy: "Synthetic Admin User",
        request,
        verificationCode: `HIST-${type}`,
        verificationExpiresAt: "2026-08-12T00:00:00.000Z",
        verificationUrl: `http://localhost:3000/verify/historical-${type}`,
      });
      const pdf = await PDFDocument.load(bytes);
      const keywords = pdf.getKeywords() ?? "";

      expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
      expect(pdf.getPageCount()).toBe(1);
      expect(isHistoricalCertificateType(type)).toBe(true);
      expect(certificateTemplateTitle(type)).toBe(title);
      expect(pdf.getTitle()).toContain(label);
      expect(keywords).toContain("REQ-TEST-HIST-0001");
      expect(keywords).toContain(`HIST-${type}`);
    },
  );

  it.each(cases)(
    "keeps long synthetic $type content within the template bounds",
    async ({ type }) => {
      const request = syntheticRequest(type);
      request.resident.full_name =
        "Alexis Example Santos With A Deliberately Long Synthetic Name For PDF Layout Testing";
      request.resident.address_sitio =
        "Sample Street Extension, Barangay Bato, Riverside Community Area, Mauban, Quezon";
      request.purpose =
        "Synthetic Purpose for Testing With Additional Detail To Exercise Long Text Wrapping Without Using Historical Resident Information";
      request.submitted_data.common.full_name = request.resident.full_name;
      request.submitted_data.common.address_sitio =
        request.resident.address_sitio;
      request.submitted_data.common.purpose = request.purpose;

      const layout = await calculateHistoricalCertificateBodyLayout({
        dateIssued: "2026-08-09",
        request,
      });
      const bytes = await generateHistoricalCertificatePdf({
        barangayCaptainName:
          "Synthetic Barangay Chairman With A Long Display Name",
        certificateNumber: `CERT-LONG-${type}`,
        dateIssued: "2026-08-09",
        preparedBy: "Synthetic Administrator With A Long Display Name",
        request,
        verificationCode: `LONG-${type}`,
        verificationExpiresAt: "2026-08-12T00:00:00.000Z",
        verificationUrl: `http://localhost:3000/verify/long-historical-${type}`,
      });
      const pdf = await PDFDocument.load(bytes);

      expect(layout.endY).toBeGreaterThanOrEqual(286);
      expect(pdf.getPageCount()).toBe(1);
    },
  );
});

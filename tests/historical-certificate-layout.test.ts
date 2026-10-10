import { describe, expect, it } from "vitest";
import zlib from "node:zlib";
import { PDFDocument } from "pdf-lib";

import {
  calculateHistoricalCertificateBodyLayout,
  getHistoricalSignatureBlockLayout,
  generateHistoricalCertificatePdf,
  HISTORICAL_CERTIFICATE_TYPES,
  isHistoricalCertificateType,
  type HistoricalCertificateType,
} from "@/lib/certificates/historical-layout";
import { fitSignatureImage } from "@/lib/certificates/pdf-signature";
import { getRequestById } from "@/lib/db/sqlite/queries";
import {
  certificateTemplateSignatureLabel,
  certificateTemplateSignatureRole,
  certificateTemplateTitle,
} from "@/lib/certificates/template-copy";

const syntheticName = "Alexis Example Santos";
const syntheticAddress = "Sample Street, Barangay Bato";
const syntheticPurpose = "Synthetic Purpose for Testing";

interface PdfStreamLike {
  getContents(): Uint8Array;
}

function isPdfStreamLike(val: unknown): val is PdfStreamLike {
  if (val && typeof val === "object" && "getContents" in val) {
    return typeof val.getContents === "function";
  }
  return false;
}

function decodeHexText(streamText: string): string {
  return streamText.replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex: string) => {
    const clean = hex.replace(/\s+/g, "");
    if (clean.length % 2 !== 0) return _;
    try {
      return Buffer.from(clean, "hex").toString("latin1");
    } catch {
      return _;
    }
  });
}

function extractPdfStreamText(pdfDoc: PDFDocument): string {
  let text = "";
  for (const [, object] of pdfDoc.context.enumerateIndirectObjects()) {
    if (isPdfStreamLike(object)) {
      const raw = object.getContents();
      try {
        text += zlib.inflateSync(Buffer.from(raw)).toString("latin1") + "\n";
      } catch {
        text += Buffer.from(raw).toString("latin1") + "\n";
      }
    }
  }
  return decodeHexText(text);
}

const cases: Array<{
  label: string;
  signatureLabel: string;
  signatureRole: string;
  title: string;
  type: HistoricalCertificateType;
}> = [
  {
    label: "Barangay Residency",
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
    title: "CERTIFICATION OF RESIDENCY",
    type: "barangay_residency",
  },
  {
    label: "Barangay Clearance",
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
    title: "CERTIFICATION OF CLEARANCE",
    type: "barangay_clearance",
  },
  {
    label: "Barangay Certificate",
    signatureLabel: "Pinatunayan ni:",
    signatureRole: "PUNONG BARANGAY",
    title: "PAGPAPATUNAY",
    type: "barangay_certificate",
  },
  {
    label: "Barangay Indigency",
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
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
          : type === "barangay_certificate"
            ? { place_of_birth: "Mauban, Quezon" }
            : {},
    },
  };
}

describe("historical certificate template alignment", () => {
  it("covers all four private certificate references", () => {
    expect(HISTORICAL_CERTIFICATE_TYPES).toEqual([
      "barangay_clearance",
      "barangay_certificate",
      "barangay_indigency",
      "barangay_residency",
    ]);
  });

  it.each(cases)(
    "keeps the $type signer image clear of the label, body, rule, name, and page edges",
    ({ signatureLabel, signatureRole, type }) => {
      const layout = getHistoricalSignatureBlockLayout(type);
      const imageTopY = layout.imageBottomY + layout.imageMaxHeight;
      const labelGlyphTopY = layout.labelY + 11;

      expect(layout.lineStart).toBeGreaterThan(306);
      expect(layout.lineEnd).toBeLessThan(612);
      expect(layout.labelY - imageTopY).toBeGreaterThanOrEqual(12);
      expect(layout.bodyBottomY - labelGlyphTopY).toBeGreaterThanOrEqual(6);
      expect(layout.imageBottomY - layout.lineY).toBe(5);
      expect(imageTopY).toBeLessThan(792);
      expect(layout.signatureX - layout.imageMaxWidth / 2).toBeGreaterThan(0);
      expect(layout.signatureX + layout.imageMaxWidth / 2).toBeLessThan(612);
      expect(layout.roleY).toBeGreaterThan(0);
      expect(layout.lineY - layout.nameY).toBe(18);
      expect(layout.nameY).toBeLessThan(layout.lineY);
      expect(layout.roleY).toBeLessThan(layout.nameY);
      expect(certificateTemplateSignatureLabel(type)).toBe(signatureLabel);
      expect(certificateTemplateSignatureRole(type)).toBe(signatureRole);
    },
  );

  it("fits the measured signature aspect ratio at exactly 1.5x without distortion", () => {
    const image = { height: 155, width: 249 };
    const original = fitSignatureImage(image, 135, 22);
    const enlarged = fitSignatureImage(image, 202.5, 33);

    expect(enlarged.width / original.width).toBeCloseTo(1.5);
    expect(enlarged.height / original.height).toBeCloseTo(1.5);
    expect(enlarged.width / enlarged.height).toBeCloseTo(249 / 155);
  });

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
      const pdfSource = Buffer.from(bytes).toString("latin1");
      expect(
        pdfSource.split("/Subtype /Image").length - 1,
      ).toBeGreaterThanOrEqual(3);
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

  it("verifies expected signer roles across all four certificate types", () => {
    expect(certificateTemplateSignatureRole("barangay_clearance")).toBe(
      "Barangay Chairman",
    );
    expect(certificateTemplateSignatureRole("barangay_indigency")).toBe(
      "Barangay Chairman",
    );
    expect(certificateTemplateSignatureRole("barangay_residency")).toBe(
      "Barangay Chairman",
    );
    expect(certificateTemplateSignatureRole("barangay_certificate")).toBe(
      "PUNONG BARANGAY",
    );
  });

  it("honors snapshot.authorized_official_role in generateHistoricalCertificatePdf without overwriting historical records", async () => {
    const request = syntheticRequest("barangay_residency");
    const bytes = await generateHistoricalCertificatePdf({
      barangayCaptainName: "DIOGENES E. MANAOG",
      certificateNumber: "CERT-HIST-CUSTOM-001",
      dateIssued: "2026-08-01",
      preparedBy: "Synthetic Admin User",
      request,
      snapshot: {
        authorized_official_display_name: "HON. FIRST LASTNAME",
        authorized_official_role: "Acting Barangay Chairman",
        certificate_number: "CERT-HIST-CUSTOM-001",
        certificate_type: "barangay_residency",
        control_number: "CTRL-001",
        date_issued: "2026-08-01",
        holder_address_sitio: "Sitio Centro",
        holder_age: 40,
        holder_birthdate: "1986-05-10",
        holder_contact_number: null,
        holder_full_name: "Resident Name",
        holder_place_of_birth: null,
        holder_years_of_residency: 10,
        issued_at: "2026-08-01T00:00:00.000Z",
        issuance_mode: "fully_online_demo",
        prepared_by_display_name: "Synthetic Admin User",
        purpose: "For Testing",
        request_number: "REQ-001",
        signature_applied_at: "2026-08-01T00:00:00.000Z",
        signature_representation_type: "visual_name_placeholder",
        signature_image_key: null,
        signature_image_provider: null,
        signature_image_sha256: null,
        verification_expires_at: "2026-08-31T00:00:00.000Z",
      },
      verificationCode: "HIST-001",
      verificationExpiresAt: "2026-08-31T00:00:00.000Z",
      verificationUrl: "http://localhost:3000/verify/hist-001",
    });

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const pdfContent = extractPdfStreamText(pdf);
    expect(pdfContent).toContain("Acting Barangay Chairman");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import zlib from "node:zlib";
import { PDFDocument } from "pdf-lib";

import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { generateHistoricalCertificatePdf } from "@/lib/certificates/historical-layout";
import { detectSignatureImageFormat } from "@/lib/certificates/signature-storage";
import { createCertificateSnapshot } from "@/lib/certificates/snapshot";
import { getRequestById } from "@/lib/db/sqlite/queries";
import type { HistoricalCertificateType } from "@/lib/certificates/historical-layout";

const transparentPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

const signerCases: Array<{
  label: string;
  role: string;
  type: HistoricalCertificateType;
}> = [
  {
    label: "Certified by:",
    role: "Barangay Chairman",
    type: "barangay_clearance",
  },
  {
    label: "Pinatunayan ni:",
    role: "PUNONG BARANGAY",
    type: "barangay_certificate",
  },
  {
    label: "Certified by:",
    role: "Barangay Chairman",
    type: "barangay_indigency",
  },
  {
    label: "Certified by:",
    role: "Barangay Chairman",
    type: "barangay_residency",
  },
];

function syntheticRequest(
  type: HistoricalCertificateType = "barangay_clearance",
) {
  const source = getRequestById("10000000-0000-4000-8000-000000000004");
  expect(source).not.toBeNull();

  return {
    ...source!,
    certificate_type: type,
    request_number: "REQ-SIGNATURE-0001",
    purpose: "Synthetic signature layout test",
    resident: {
      address_sitio: "Sample Sitio, Barangay Bato",
      age: 32,
      date_of_birth: "1994-01-02",
      full_name: "Synthetic Resident Example",
    },
    submitted_data: {
      common: {
        address_sitio: "Sample Sitio, Barangay Bato",
        age: 32,
        contact_number: "09000000000",
        full_name: "Synthetic Resident Example",
        purpose: "Synthetic signature layout test",
      },
      certificate_specific:
        type === "barangay_residency"
          ? { birthdate: "1994-01-02", years_of_residency: 8 }
          : type === "barangay_certificate"
            ? { place_of_birth: "Demo Town, Quezon" }
            : {},
    },
  };
}

function imageCount(bytes: Uint8Array) {
  return (
    Buffer.from(bytes).toString("latin1").split("/Subtype /Image").length - 1
  );
}

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


describe("official signer signature", () => {
  it("accepts only PNG and JPEG signature assets", () => {
    expect(detectSignatureImageFormat(transparentPng)).toBe("png");
    expect(
      detectSignatureImageFormat(
        Uint8Array.from([
          0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]),
      ),
    ).toBe("jpeg");
    expect(
      detectSignatureImageFormat(Uint8Array.from([1, 2, 3, 4])),
    ).toBeNull();
  });

  it("records the official role and image metadata in the issuance snapshot", () => {
    const request = syntheticRequest();
    const snapshot = createCertificateSnapshot({
      authorizedOfficialName: "DIOGENES E. MANAOG",
      authorizedOfficialRole: "Barangay Chairman",
      certificateNumber: "CERT-SIGNATURE-0001",
      dateIssued: "2026-09-02",
      issuedAt: "2026-09-02T00:00:00.000Z",
      issuanceMode: "fully_online_demo",
      preparedBy: "Synthetic Admin User",
      request,
      signatureImageKey: "signatures/diogenes.png",
      signatureImageProvider: "local",
      signatureImageSha256: "synthetic-signature-hash",
      verificationExpiresAt: "2026-09-05T00:00:00.000Z",
    });

    expect(snapshot.authorized_official_display_name).toBe(
      "DIOGENES E. MANAOG",
    );
    expect(snapshot.authorized_official_role).toBe("Barangay Chairman");
    expect(snapshot.signature_representation_type).toBe(
      "visual_signature_image",
    );
    expect(snapshot.signature_image_key).toBe("signatures/diogenes.png");
    expect(snapshot.signature_image_sha256).toBe("synthetic-signature-hash");
    expect(snapshot.signature_applied_at).toBe("2026-09-02T00:00:00.000Z");
  });

  it.each(signerCases)(
    "renders the configured signature block for $type",
    ({ label, role, type }) => {
      const markup = renderToStaticMarkup(
        <PrintableCertificate
          barangayCaptainName="DIOGENES E. MANAOG"
          dateIssued="2026-09-02"
          request={syntheticRequest(type)}
          signatureImageUrl="/api/admin/signature"
        />,
      );
      const signatureImageIndex = markup.indexOf('src="/api/admin/signature"');
      const signatureLineIndex = markup.indexOf('data-signature-line="true"');
      const signerNameIndex = markup.indexOf("DIOGENES E. MANAOG");

      expect(signatureImageIndex).toBeGreaterThanOrEqual(0);
      expect(signatureImageIndex).toBeLessThan(signatureLineIndex);
      expect(signatureLineIndex).toBeLessThan(signerNameIndex);
      expect(markup).toContain(role);
      expect(markup).toContain(label);
      expect(markup).toContain("no-print");
      expect(markup).not.toContain("Prepared By");
      expect(markup).not.toContain("Synthetic Admin User");
    },
  );

  it("renders the issued short verification code, expiry, and QR in the HTML certificate", () => {
    const verificationCode = "BB-1234ABCD";
    const qrCodeUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const markup = renderToStaticMarkup(
      <PrintableCertificate
        certificateNumber="CERT-2026-VERIFY-01"
        dateIssued="2026-10-10"
        request={syntheticRequest("barangay_residency")}
        verificationCode={verificationCode}
        verificationExpiresAt="2026-11-10T00:00:00.000Z"
        verificationQrCodeUrl={qrCodeUrl}
      />,
    );

    expect(markup).toContain("CERT-2026-VERIFY-01");
    expect(markup).toContain(verificationCode);
    expect(markup).toContain("Nov 10, 2026");
    expect(markup).toContain(
      'alt="QR code for certificate verification"',
    );
    expect(markup).toContain(`src="${qrCodeUrl}"`);
    expect(markup).toContain("System record verification does not establish");
  });


  it("clearly renders an unsigned draft without the official name or signature image", () => {
    const markup = renderToStaticMarkup(
      <PrintableCertificate
        barangayCaptainName="DIOGENES E. MANAOG"
        dateIssued="2026-09-02"
        draft
        request={syntheticRequest()}
        signatureImageUrl="/api/admin/signature"
      />,
    );

    expect(markup).toContain("Unsigned draft - not issued");
    expect(markup).toContain("Signature applied after signing");
    expect(markup).not.toContain('src="/api/admin/signature"');
    expect(markup).not.toContain("DIOGENES E. MANAOG");
  });

  it.each(signerCases)(
    "embeds the supplied signature image in the $type PDF",
    async ({ type }) => {
      const common = {
        barangayCaptainName: "DIOGENES E. MANAOG",
        certificateNumber: `CERT-SIGNATURE-${type}`,
        dateIssued: "2026-09-02",
        preparedBy: "Synthetic Admin User",
        request: syntheticRequest(type),
        verificationCode: `SIGNATURE-${type}`,
        verificationExpiresAt: "2026-09-05T00:00:00.000Z",
        verificationUrl: `http://localhost:3000/verify/signature-${type}`,
      } as const;
      const withoutSignature = await generateHistoricalCertificatePdf(common);
      const withSignature = await generateHistoricalCertificatePdf({
        ...common,
        signatureImage: {
          bytes: transparentPng,
          contentType: "image/png",
        },
      });
      const pdf = await PDFDocument.load(withSignature);

      expect(pdf.getPageCount()).toBe(1);
      expect(imageCount(withSignature)).toBeGreaterThan(
        imageCount(withoutSignature),
      );
    },
  );

  it("honors the saved signer role from an existing historical snapshot in both HTML preview and PDF", async () => {
    const request = syntheticRequest("barangay_residency");
    const historicalSnapshot = createCertificateSnapshot({
      authorizedOfficialName: "HON. FIRST LASTNAME",
      authorizedOfficialRole: "Acting Barangay Chairman",
      certificateNumber: "CERT-HISTORICAL-RESIDENCY-001",
      dateIssued: "2026-08-01",
      issuedAt: "2026-08-01T00:00:00.000Z",
      issuanceMode: "fully_online_demo",
      preparedBy: "Staff Member",
      request,
      verificationExpiresAt: "2026-08-30T00:00:00.000Z",
    });
    const savedRequestNumber = historicalSnapshot.request_number;
    const savedControlNumber = historicalSnapshot.control_number;
    request.request_number = "REQ-LIVE-CHANGED";
    request.control_number = "CTRL-LIVE-CHANGED";

    // Historical snapshot retains "Acting Barangay Chairman"
    expect(historicalSnapshot.authorized_official_role).toBe(
      "Acting Barangay Chairman",
    );

    // HTML preview must display the snapshot's recorded role and metadata.
    const markup = renderToStaticMarkup(
      <PrintableCertificate
        request={request}
        snapshot={historicalSnapshot}
        signatureImageUrl="/api/admin/signature"
        verificationCode="BB-0000ABCD"
        verificationQrCodeUrl="data:image/png;base64,synthetic-qr"
      />,
    );
    expect(markup).toContain("Acting Barangay Chairman");
    expect(markup).toContain("HON. FIRST LASTNAME");
    expect(markup).toContain(savedRequestNumber);
    expect(markup).toContain(savedControlNumber ?? "Pending");
    expect(markup).not.toContain("REQ-LIVE-CHANGED");
    expect(markup).not.toContain("CTRL-LIVE-CHANGED");
    expect(markup).toContain("BB-0000ABCD");
    expect(markup).toContain("Aug 30, 2026");
    // PDF must also honor the snapshot's recorded role
    const pdfBytes = await generateHistoricalCertificatePdf({
      preparedBy: "Staff Member",
      request,
      snapshot: historicalSnapshot,
      verificationCode: "HIST-VERIFY-01",
      verificationExpiresAt: "2026-08-30T00:00:00.000Z",
      verificationUrl: "http://localhost:3000/verify/hist-verify-01",
    });
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const pdfText = extractPdfStreamText(pdfDoc);
    expect(pdfText).toContain("Acting Barangay Chairman");
  });

  it("uses 'Barangay Chairman' by default for newly issued Residency certificates without a pre-existing role", async () => {
    const request = syntheticRequest("barangay_residency");
    const newSnapshot = createCertificateSnapshot({
      authorizedOfficialName: "DIOGENES E. MANAOG",
      authorizedOfficialRole: "",
      certificateNumber: "CERT-NEW-RESIDENCY-001",
      dateIssued: "2026-10-10",
      issuedAt: "2026-10-10T00:00:00.000Z",
      issuanceMode: "fully_online_demo",
      preparedBy: "Staff Member",
      request,
      verificationExpiresAt: "2026-11-10T00:00:00.000Z",
    });

    expect(newSnapshot.authorized_official_role).toBe("Barangay Chairman");

    const markup = renderToStaticMarkup(
      <PrintableCertificate
        request={request}
        snapshot={newSnapshot}
        signatureImageUrl="/api/admin/signature"
      />,
    );
    expect(markup).toContain("Barangay Chairman");
    expect(markup).not.toContain("Acting Barangay Chairman");

    const pdfBytes = await generateHistoricalCertificatePdf({
      preparedBy: "Staff Member",
      request,
      snapshot: newSnapshot,
      verificationCode: "NEW-VERIFY-01",
      verificationExpiresAt: "2026-11-10T00:00:00.000Z",
      verificationUrl: "http://localhost:3000/verify/new-verify-01",
    });
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pdfText = extractPdfStreamText(pdfDoc);
    expect(pdfText).toContain("Barangay Chairman");
    expect(pdfText).not.toContain("Acting Barangay Chairman");
  });
});

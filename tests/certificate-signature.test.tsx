import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { generateHistoricalCertificatePdf } from "@/lib/certificates/historical-layout";
import { detectSignatureImageFormat } from "@/lib/certificates/signature-storage";
import { createCertificateSnapshot } from "@/lib/certificates/snapshot";
import { getRequestById } from "@/lib/db/sqlite/queries";

const transparentPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

function syntheticRequest() {
  const source = getRequestById("10000000-0000-4000-8000-000000000004");
  expect(source).not.toBeNull();

  return {
    ...source!,
    certificate_type: "barangay_clearance" as const,
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
      certificate_specific: {},
    },
  };
}

function imageCount(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("latin1").split("/Subtype /Image").length - 1;
}

describe("official signer signature", () => {
  it("accepts only PNG and JPEG signature assets", () => {
    expect(detectSignatureImageFormat(transparentPng)).toBe("png");
    expect(
      detectSignatureImageFormat(
        Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
      ),
    ).toBe("jpeg");
    expect(detectSignatureImageFormat(Uint8Array.from([1, 2, 3, 4]))).toBeNull();
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

    expect(snapshot.authorized_official_display_name).toBe("DIOGENES E. MANAOG");
    expect(snapshot.authorized_official_role).toBe("Barangay Chairman");
    expect(snapshot.signature_representation_type).toBe("visual_signature_image");
    expect(snapshot.signature_image_key).toBe("signatures/diogenes.png");
    expect(snapshot.signature_image_sha256).toBe("synthetic-signature-hash");
  });

  it("renders the protected signature image in the HTML certificate preview", () => {
    const markup = renderToStaticMarkup(
      <PrintableCertificate
        barangayCaptainName="DIOGENES E. MANAOG"
        dateIssued="2026-09-02"
        preparedBy="Synthetic Admin User"
        request={syntheticRequest()}
        signatureImageUrl="/api/admin/signature"
      />,
    );

    expect(markup).toContain('src="/api/admin/signature"');
    expect(markup).toContain("DIOGENES E. MANAOG");
    expect(markup).toContain("Barangay Chairman");
    expect(markup).toContain("Visual electronic signature for thesis/demo use only");
  });

  it("embeds the supplied signature image in the printable PDF", async () => {
    const request = syntheticRequest();
    const common = {
      barangayCaptainName: "DIOGENES E. MANAOG",
      certificateNumber: "CERT-SIGNATURE-0001",
      dateIssued: "2026-09-02",
      preparedBy: "Synthetic Admin User",
      request,
      verificationCode: "SIGNATURE-TEST",
      verificationExpiresAt: "2026-09-05T00:00:00.000Z",
      verificationUrl: "http://localhost:3000/verify/signature-test",
    } as const;
    const withoutSignature = await generateHistoricalCertificatePdf(common);
    const withSignature = await generateHistoricalCertificatePdf({
      ...common,
      signatureImage: {
        bytes: transparentPng,
        contentType: "image/png",
      },
    });

    await PDFDocument.load(withSignature);
    expect(imageCount(withSignature)).toBeGreaterThan(imageCount(withoutSignature));
  });
});

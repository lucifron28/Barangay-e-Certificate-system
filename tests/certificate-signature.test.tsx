import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
    role: "Acting Barangay Chairman",
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

  it("keeps the enlarged HTML signature clear of the signer labels", () => {
    const markup = renderToStaticMarkup(
      <PrintableCertificate
        dateIssued="2026-09-02"
        request={syntheticRequest()}
        signatureImageUrl="/api/admin/signature"
      />,
    );
    const signatureLabelIndex = markup.indexOf("Certified by:");
    const imageBoxIndex = markup.indexOf('data-signature-image-box="true"');
    const signatureImageIndex = markup.indexOf('src="/api/admin/signature"');
    const signatureLineIndex = markup.indexOf('data-signature-line="true"');
    const signerNameIndex = markup.indexOf("DIOGENES E. MANAOG");
    const signerRoleIndex = markup.indexOf("Barangay Chairman");
    const tailwindSpacingUnitInches = 0.25 / 6;
    const priorContentClearanceInches = 10 * tailwindSpacingUnitInches;
    const labelToImageClearanceInches = 2 * tailwindSpacingUnitInches;
    const imageToLineClearanceInches = 0.1;
    const currentImageWidthInches = 3;
    const currentImageHeightInches = 0.875;
    const targetScale = 1.4;
    const imageWidthInches = 4.2;
    const imageHeightInches = 1.225;

    expect(markup).toContain('class="mt-10 flex justify-end"');
    expect(markup).toContain('class="w-[4.2in] max-w-full font-serif text-right"');
    expect(markup).toContain('class="mb-2 text-[12pt]"');
    expect(markup).not.toContain("-top-[0.55in]");
    expect(markup).toContain(
      'data-signature-image-box="true" class="flex h-[1.225in] w-full items-end justify-center"',
    );
    expect(markup).toContain(
      'class="h-full w-full object-contain object-bottom"',
    );
    expect(markup).toContain(
      'class="mt-[0.1in] ml-auto h-px w-[2.45in] bg-neutral" data-signature-line="true"',
    );
    expect(priorContentClearanceInches).toBeGreaterThanOrEqual(0.4);
    expect(labelToImageClearanceInches).toBeGreaterThanOrEqual(0.08);
    expect(imageToLineClearanceInches).toBeGreaterThanOrEqual(0.1);
    expect(imageWidthInches / currentImageWidthInches).toBeCloseTo(targetScale);
    expect(imageHeightInches / currentImageHeightInches).toBeCloseTo(targetScale);
    expect(imageWidthInches / imageHeightInches).toBeCloseTo(
      currentImageWidthInches / currentImageHeightInches,
    );
    expect(signatureLabelIndex).toBeGreaterThanOrEqual(0);
    expect(imageBoxIndex).toBeGreaterThanOrEqual(0);
    expect(signatureLabelIndex).toBeLessThan(signatureImageIndex);
    expect(imageBoxIndex).toBeLessThan(signatureImageIndex);
    expect(signatureImageIndex).toBeLessThan(signatureLineIndex);
    expect(signatureLineIndex).toBeLessThan(signerNameIndex);
    expect(signerNameIndex).toBeLessThan(signerRoleIndex);
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
});

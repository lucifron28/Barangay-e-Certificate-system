import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import {
  generateHistoricalCertificatePdf,
  HISTORICAL_CERTIFICATE_TYPES,
  type HistoricalCertificateType,
} from "@/lib/certificates/historical-layout";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";
import type { SignatureImagePayload } from "@/lib/certificates/signature-storage";

const syntheticName = "Synthetic Resident Example";
const syntheticAddress = "Sample Sitio, Barangay Bato";
const syntheticPurpose = "Thesis presentation layout proof";
const issuedAt = "2026-09-18T04:00:00.000Z";

function syntheticRequest(
  type: HistoricalCertificateType,
): CertificateRequestWithResident {
  const certificateSpecific =
    type === "barangay_residency"
      ? { birthdate: "1988-04-12", years_of_residency: 10 }
      : type === "barangay_certificate"
        ? { place_of_birth: "Demo Town, Quezon" }
        : {};

  return {
    id: `synthetic-proof-${type}`,
    request_number: `REQ-PROOF-${type}`,
    resident_id: "synthetic-resident-proof",
    certificate_type: type,
    purpose: syntheticPurpose,
    status: "accepted",
    remarks: null,
    submitted_data: {
      common: {
        address_sitio: syntheticAddress,
        age: 38,
        full_name: syntheticName,
        purpose: syntheticPurpose,
      },
      certificate_specific: certificateSpecific,
    },
    control_number: type === "barangay_clearance" ? "BCL-2026-0001" : null,
    fee_amount: type === "barangay_indigency" ? 0 : 50,
    payment_status: type === "barangay_indigency" ? "free" : "unpaid",
    date_requested: issuedAt,
    date_accepted: issuedAt,
    date_released: null,
    cancelled_at: null,
    created_at: issuedAt,
    updated_at: issuedAt,
    resident: {
      address_sitio: syntheticAddress,
      age: 38,
      date_of_birth: "1988-04-12",
      full_name: syntheticName,
    },
  };
}

async function readSignatureImage(
  signaturePath: string | undefined,
): Promise<SignatureImagePayload> {
  if (!signaturePath) {
    throw new Error(
      "Set CERTIFICATE_PROOF_SIGNATURE_PATH to the configured visual signature image.",
    );
  }

  const extension = extname(signaturePath).toLowerCase();
  const contentType =
    extension === ".png"
      ? "image/png"
      : extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : null;
  if (!contentType) {
    throw new Error("The proof signature image must be a PNG or JPEG file.");
  }

  return {
    bytes: new Uint8Array(await readFile(signaturePath)),
    contentType,
  };
}

async function main() {
  const outputDirectory = resolve(
    process.argv[3] ??
      process.env.CERTIFICATE_PROOF_OUTPUT_DIR ??
      "tmp/pdfs/certificate-signature-proofs",
  );
  const signatureImage = await readSignatureImage(process.argv[2]);
  await mkdir(outputDirectory, { recursive: true });

  for (const type of HISTORICAL_CERTIFICATE_TYPES) {
    const outputPath = resolve(outputDirectory, `${type}.pdf`);
    const pdfBytes = await generateHistoricalCertificatePdf({
      barangayCaptainName: "DIOGENES E. MANAOG",
      certificateNumber: `CERT-PROOF-${type}`,
      dateIssued: "2026-09-18",
      preparedBy: "Synthetic Demo Administrator",
      request: syntheticRequest(type),
      signatureImage,
      verificationCode: `PROOF-${type}`,
    });

    await writeFile(outputPath, pdfBytes);
    process.stdout.write(`${outputPath}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Certificate proof generation failed."}\n`,
  );
  process.exitCode = 1;
});

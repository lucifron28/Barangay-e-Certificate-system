import "server-only";

import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

function certificateStorageDirectory() {
  const configuredDirectory = process.env.CERTIFICATE_STORAGE_DIRECTORY;
  return configuredDirectory
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDirectory)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "certificates");
}

export function savePrivateCertificatePdf(certificateId: string, pdfBytes: Uint8Array) {
  const directory = certificateStorageDirectory();
  mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${certificateId}.pdf`);
  const temporaryPath = path.join(directory, `${certificateId}.pdf.tmp`);
  try {
    writeFileSync(temporaryPath, pdfBytes, { flag: "wx" });
    renameSync(temporaryPath, filePath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  return filePath;
}

export function removePrivateCertificatePdf(filePath: string) {
  rmSync(filePath, { force: true });
}

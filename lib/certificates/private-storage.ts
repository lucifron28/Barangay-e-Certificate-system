import "server-only";

import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export function savePrivateCertificatePdf(certificateId: string, pdfBytes: Uint8Array) {
  const directory = path.join(process.cwd(), "data", "certificates");
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

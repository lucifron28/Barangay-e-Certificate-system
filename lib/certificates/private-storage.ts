import "server-only";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function savePrivateCertificatePdf(certificateId: string, pdfBytes: Uint8Array) {
  const directory = path.join(process.cwd(), "data", "certificates");
  mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, `${certificateId}.pdf`);
  writeFileSync(filePath, pdfBytes, { flag: "wx" });
  return filePath;
}

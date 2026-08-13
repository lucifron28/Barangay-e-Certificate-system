import "server-only";

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { get, put, del } from "@vercel/blob";
import { env } from "@/lib/env";

export type CertificateStorageProvider = "local" | "vercel_blob";

export type StoredCertificatePdf = {
  provider: CertificateStorageProvider;
  key: string;
  path: string | null;
};

export function getPrivateCertificateStorageDirectory() {
  const configuredDirectory = process.env.CERTIFICATE_STORAGE_DIRECTORY;
  return configuredDirectory
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDirectory)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "certificates");
}

export function savePrivateCertificatePdf(certificateId: string, pdfBytes: Uint8Array) {
  const directory = getPrivateCertificateStorageDirectory();
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

export function getCertificateStorageProvider(): CertificateStorageProvider {
  return env.certificateStorageProvider;
}

export function hasCertificateStorageConfiguration() {
  return getCertificateStorageProvider() === "local" || Boolean(env.blobReadWriteToken);
}

export async function storeCertificatePdf(certificateId: string, pdfBytes: Uint8Array): Promise<StoredCertificatePdf> {
  if (getCertificateStorageProvider() === "local") {
    return {
      path: savePrivateCertificatePdf(certificateId, pdfBytes),
      provider: "local",
      key: `${certificateId}.pdf`,
    };
  }
  if (!env.blobReadWriteToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for private Vercel Blob storage.");
  }
  const pathname = `certificates/${certificateId}.pdf`;
  const blob = await put(pathname, Buffer.from(pdfBytes), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/pdf",
    token: env.blobReadWriteToken,
  });
  return { key: blob.pathname, path: null, provider: "vercel_blob" };
}

export async function removeStoredCertificatePdf(stored: StoredCertificatePdf) {
  if (stored.provider === "local") {
    if (stored.path) removePrivateCertificatePdf(stored.path);
    return;
  }
  if (env.blobReadWriteToken) {
    await del(stored.key, { token: env.blobReadWriteToken });
  }
}

export async function readStoredCertificatePdf(input: {
  key: string | null;
  path: string | null;
  provider: CertificateStorageProvider;
}) {
  if (input.provider === "local") {
    if (!input.path || !existsSync(input.path)) return null;
    return new Uint8Array(readFileSync(input.path));
  }
  if (!input.key || !env.blobReadWriteToken) return null;
  const result = await get(input.key, {
    access: "private",
    token: env.blobReadWriteToken,
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

export function storedCertificateArtifactExists(input: {
  key: string | null;
  path: string | null;
  provider: CertificateStorageProvider;
}) {
  if (input.provider === "local") return Boolean(input.path && existsSync(input.path));
  return Boolean(input.key && env.blobReadWriteToken);
}

import "server-only";

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { env } from "@/lib/env";
import {
  computeSha256,
  detectImageFormat,
  formatToMimeType,
} from "@/lib/payments/storage";

export const MAX_SIGNATURE_IMAGE_BYTES = 2 * 1024 * 1024;

export type SignatureImageFormat = "jpeg" | "png";
export type SignatureStorageProvider = "local" | "vercel_blob";

export type StoredSignatureImage = {
  contentType: string;
  format: SignatureImageFormat;
  key: string;
  path: string | null;
  provider: SignatureStorageProvider;
  sha256: string;
};

export function detectSignatureImageFormat(
  bytes: Uint8Array,
): SignatureImageFormat | null {
  const format = detectImageFormat(bytes);
  return format === "jpeg" || format === "png" ? format : null;
}

function getSignatureStorageDirectory() {
  const configured = process.env.SIGNATURE_STORAGE_DIRECTORY;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "signatures");
}

export function getSignatureStorageProvider(): SignatureStorageProvider {
  return env.certificateStorageProvider;
}

export async function storeSignatureImage(
  bytes: Uint8Array,
  format: SignatureImageFormat,
): Promise<StoredSignatureImage> {
  const extension = format === "jpeg" ? "jpg" : "png";
  const fileName = `${randomUUID()}.${extension}`;
  const contentType = formatToMimeType(format);
  const sha256 = computeSha256(bytes);
  const provider = getSignatureStorageProvider();

  if (provider === "local") {
    const directory = getSignatureStorageDirectory();
    mkdirSync(directory, { recursive: true });
    const filePath = path.join(directory, fileName);
    const temporaryPath = `${filePath}.tmp`;

    try {
      writeFileSync(temporaryPath, bytes, { flag: "wx" });
      renameSync(temporaryPath, filePath);
    } catch (error) {
      rmSync(temporaryPath, { force: true });
      throw error;
    }

    return {
      contentType,
      format,
      key: `signatures/${fileName}`,
      path: filePath,
      provider,
      sha256,
    };
  }

  if (!env.blobReadWriteToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for private signature storage.");
  }

  const pathname = `signatures/${fileName}`;
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token: env.blobReadWriteToken,
  });

  return {
    contentType,
    format,
    key: blob.pathname,
    path: null,
    provider,
    sha256,
  };
}

export async function readStoredSignatureImage(input: {
  key: string | null;
  path?: string | null;
  provider: SignatureStorageProvider;
}): Promise<{ bytes: Uint8Array; contentType: string; sha256: string } | null> {
  if (!input.key) return null;

  if (input.provider === "local") {
    const filePath = input.path ?? path.join(getSignatureStorageDirectory(), path.basename(input.key));
    if (!existsSync(filePath)) return null;

    const bytes = new Uint8Array(readFileSync(filePath));
    const format = detectSignatureImageFormat(bytes);
    if (!format) return null;

    return {
      bytes,
      contentType: formatToMimeType(format),
      sha256: computeSha256(bytes),
    };
  }

  if (!env.blobReadWriteToken) return null;
  const result = await get(input.key, {
    access: "private",
    token: env.blobReadWriteToken,
    useCache: false,
  });
  if (!result || result.statusCode !== 200) return null;

  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
  const format = detectSignatureImageFormat(bytes);
  if (!format) return null;

  return {
    bytes,
    contentType: formatToMimeType(format),
    sha256: computeSha256(bytes),
  };
}

export async function removeStoredSignatureImage(input: {
  key: string | null;
  path?: string | null;
  provider: SignatureStorageProvider;
}) {
  if (!input.key) return;

  if (input.provider === "local") {
    if (input.path) rmSync(input.path, { force: true });
    return;
  }

  if (env.blobReadWriteToken) {
    await del(input.key, { token: env.blobReadWriteToken });
  }
}

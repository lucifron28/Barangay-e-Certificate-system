import "server-only";

import { createHash, randomUUID } from "node:crypto";
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

export const MAX_PAYMENT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export type AllowedImageFormat = "jpeg" | "png" | "webp";

export type StoredPrivateFile = {
  key: string;
  path: string | null;
  provider: "local" | "vercel_blob";
  sha256: string;
  contentType: string;
};

export function detectImageFormat(bytes: Uint8Array): AllowedImageFormat | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function formatToMimeType(format: AllowedImageFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}

export function computeSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function getProofStorageDirectory() {
  const configured = process.env.PAYMENT_PROOF_STORAGE_DIRECTORY;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "payment-proofs");
}

function getMerchantQrStorageDirectory() {
  const configured = process.env.MERCHANT_QR_STORAGE_DIRECTORY;
  return configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "merchant-qrs");
}

export function getPaymentStorageProvider(): "local" | "vercel_blob" {
  return env.certificateStorageProvider === "vercel_blob" ? "vercel_blob" : "local";
}

export async function storePaymentProofImage(
  bytes: Uint8Array,
  format: AllowedImageFormat,
): Promise<StoredPrivateFile> {
  const sha256 = computeSha256(bytes);
  const extension = format === "jpeg" ? "jpg" : format;
  const fileName = `${randomUUID()}.${extension}`;
  const contentType = formatToMimeType(format);
  const provider = getPaymentStorageProvider();

  if (provider === "local") {
    const dir = getProofStorageDirectory();
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(/* turbopackIgnore: true */ dir, fileName);
    const tmpPath = path.join(/* turbopackIgnore: true */ dir, `${fileName}.tmp`);
    try {
      writeFileSync(tmpPath, bytes, { flag: "wx" });
      renameSync(tmpPath, filePath);
    } catch (error) {
      rmSync(tmpPath, { force: true });
      throw error;
    }
    return {
      contentType,
      key: `payment-proofs/${fileName}`,
      path: filePath,
      provider: "local",
      sha256,
    };
  }

  if (!env.blobReadWriteToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for private Vercel Blob storage.");
  }

  const pathname = `payment-proofs/${fileName}`;
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token: env.blobReadWriteToken,
  });

  return {
    contentType,
    key: blob.pathname,
    path: null,
    provider: "vercel_blob",
    sha256,
  };
}

export async function storeMerchantQrImage(
  providerName: "gcash" | "maya",
  bytes: Uint8Array,
  format: AllowedImageFormat,
): Promise<StoredPrivateFile> {
  const sha256 = computeSha256(bytes);
  const extension = format === "jpeg" ? "jpg" : format;
  const fileName = `${providerName}-qr-${randomUUID().slice(0, 8)}.${extension}`;
  const contentType = formatToMimeType(format);
  const provider = getPaymentStorageProvider();

  if (provider === "local") {
    const dir = getMerchantQrStorageDirectory();
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(/* turbopackIgnore: true */ dir, fileName);
    const tmpPath = path.join(/* turbopackIgnore: true */ dir, `${fileName}.tmp`);
    try {
      writeFileSync(tmpPath, bytes, { flag: "wx" });
      renameSync(tmpPath, filePath);
    } catch (error) {
      rmSync(tmpPath, { force: true });
      throw error;
    }
    return {
      contentType,
      key: `merchant-qrs/${fileName}`,
      path: filePath,
      provider: "local",
      sha256,
    };
  }

  if (!env.blobReadWriteToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for private Vercel Blob storage.");
  }

  const pathname = `merchant-qrs/${fileName}`;
  const blob = await put(pathname, Buffer.from(bytes), {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token: env.blobReadWriteToken,
  });

  return {
    contentType,
    key: blob.pathname,
    path: null,
    provider: "vercel_blob",
    sha256,
  };
}

export async function readPrivatePaymentFile(input: {
  key: string | null;
  provider: "local" | "vercel_blob";
}): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!input.key) return null;

  if (input.provider === "local") {
    let filePath: string;
    if (input.key.startsWith("merchant-qrs/")) {
      const fileName = input.key.replace("merchant-qrs/", "");
      filePath = path.join(/* turbopackIgnore: true */ getMerchantQrStorageDirectory(), fileName);
    } else {
      const fileName = input.key.replace("payment-proofs/", "");
      filePath = path.join(/* turbopackIgnore: true */ getProofStorageDirectory(), fileName);
    }

    if (!existsSync(filePath)) return null;
    const bytes = new Uint8Array(readFileSync(filePath));
    const format = detectImageFormat(bytes);
    const contentType = format ? formatToMimeType(format) : "application/octet-stream";
    return { bytes, contentType };
  }

  if (!env.blobReadWriteToken) return null;

  const result = await get(input.key, {
    access: "private",
    token: env.blobReadWriteToken,
    useCache: false,
  });

  if (!result || result.statusCode !== 200) return null;
  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
  const format = detectImageFormat(bytes);
  const contentType = format ? formatToMimeType(format) : "application/octet-stream";
  return { bytes, contentType };
}

export async function deletePrivatePaymentFile(input: {
  key: string | null;
  provider: "local" | "vercel_blob";
}) {
  if (!input.key) return;

  if (input.provider === "local") {
    let filePath: string;
    if (input.key.startsWith("merchant-qrs/")) {
      const fileName = input.key.replace("merchant-qrs/", "");
      filePath = path.join(/* turbopackIgnore: true */ getMerchantQrStorageDirectory(), fileName);
    } else {
      const fileName = input.key.replace("payment-proofs/", "");
      filePath = path.join(/* turbopackIgnore: true */ getProofStorageDirectory(), fileName);
    }
    rmSync(filePath, { force: true });
    return;
  }

  if (env.blobReadWriteToken) {
    await del(input.key, { token: env.blobReadWriteToken });
  }
}

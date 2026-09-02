import {
  PDFDocument,
  type PDFImage,
} from "pdf-lib";
import type { SignatureImagePayload } from "@/lib/certificates/signature-storage";

export async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signatureImage?: SignatureImagePayload,
): Promise<PDFImage | null> {
  if (!signatureImage) return null;

  if (signatureImage.contentType === "image/png") {
    return pdfDoc.embedPng(signatureImage.bytes);
  }

  if (signatureImage.contentType === "image/jpeg") {
    return pdfDoc.embedJpg(signatureImage.bytes);
  }

  return null;
}

export function fitSignatureImage(
  image: PDFImage,
  maxWidth: number,
  maxHeight: number,
) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return {
    height: image.height * scale,
    width: image.width * scale,
  };
}

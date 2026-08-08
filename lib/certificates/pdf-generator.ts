import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { certificateLabel } from "@/lib/utils/format";
import {
  certificateTemplateSalutation,
  certificateTemplateTitle,
} from "@/lib/certificates/template-copy";
import {
  getCertificateTemplateData,
  type CertificateRequestWithResident,
} from "@/lib/certificates/template-data";
import type { CertificateSnapshot } from "@/types/database";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const MARGIN = 54;

// Keep the lower-page regions independent so the signature, QR block, and disclaimer never share the same coordinates.
export const CERTIFICATE_LAYOUT_REGIONS = {
  bodyBottom: 226,
  footer: { height: 38, width: LETTER_WIDTH - MARGIN * 2, x: MARGIN, y: 23 },
  qr: { size: 56, x: 490, y: 78 },
  signature: { height: 66, width: LETTER_WIDTH - MARGIN * 2, x: MARGIN, y: 145 },
  verification: { height: 68, width: 228, x: 330, y: 72 },
} as const;

type PdfFonts = {
  bold: PDFFont;
  regular: PDFFont;
  serif: PDFFont;
};

type DrawTextOptions = {
  color?: RGB;
  font?: PDFFont;
  size?: number;
};

function safePdfText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/₱/g, "PHP")
    .normalize("NFC");
}

export function normalizePdfText(value: string) {
  return safePdfText(value);
}

function formatPdfDateTime(value: string | undefined) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function centerText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = rgb(0.05, 0.05, 0.05),
) {
  const normalized = safePdfText(text);
  page.drawText(normalized, {
    x: (LETTER_WIDTH - font.widthOfTextAtSize(normalized, size)) / 2,
    y,
    font,
    size,
    color,
  });
}

function centerTextAt(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = rgb(0.05, 0.05, 0.05),
) {
  const normalized = safePdfText(text);
  page.drawText(normalized, {
    x: centerX - font.widthOfTextAtSize(normalized, size) / 2,
    y,
    font,
    size,
    color,
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  { color = rgb(0.05, 0.05, 0.05), font, size = 11 }: DrawTextOptions,
) {
  if (!font) {
    return;
  }

  page.drawText(safePdfText(text), {
    x,
    y,
    color,
    font,
    size,
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawWrappedText({
  font,
  lineHeight,
  maxWidth,
  page,
  size,
  text,
  x,
  y,
}: {
  font: PDFFont;
  lineHeight: number;
  maxWidth: number;
  page: PDFPage;
  size: number;
  text: string;
  x: number;
  y: number;
}) {
  let currentY = y;

  for (const line of wrapText(text, font, size, maxWidth)) {
    page.drawText(line, {
      x,
      y: currentY,
      font,
      size,
      color: rgb(0.05, 0.05, 0.05),
    });
    currentY -= lineHeight;
  }

  return currentY;
}

function drawSealPlaceholder(
  page: PDFPage,
  x: number,
  y: number,
  label: string,
  fonts: PdfFonts,
) {
  page.drawEllipse({
    x,
    y,
    xScale: 33,
    yScale: 33,
    borderColor: rgb(0.05, 0.05, 0.05),
    borderWidth: 1.2,
    color: rgb(1, 1, 1),
  });
  centerTextAt(page, label, x, y - 4, fonts.bold, 6.5);
}

function drawWatermark(page: PDFPage, fonts: PdfFonts) {
  const color = rgb(0.88, 0.88, 0.88);
  page.drawEllipse({
    x: LETTER_WIDTH / 2,
    y: LETTER_HEIGHT / 2,
    xScale: 230,
    yScale: 230,
    borderColor: color,
    borderWidth: 8,
  });
  centerText(page, "BARANGAY BATO", 430, fonts.bold, 42, color);
  centerText(page, "MAUBAN, QUEZON", 382, fonts.bold, 34, color);
}

function drawHeader(page: PDFPage, fonts: PdfFonts) {
  drawSealPlaceholder(page, 102, 710, "BAYAN NG MAUBAN", fonts);
  drawSealPlaceholder(page, 510, 710, "BARANGAY BATO", fonts);
  centerText(page, "Republic of the Philippines", 730, fonts.regular, 11);
  centerText(page, "Province of Quezon", 715, fonts.regular, 11);
  centerText(page, "Municipality of Mauban", 700, fonts.regular, 11);
  centerText(page, "BARANGAY BATO", 675, fonts.bold, 20);
  centerText(page, "Office of the Punong Barangay", 660, fonts.regular, 11);
}

function bodyParagraphs(
  request: CertificateRequestWithResident,
  snapshot?: CertificateSnapshot,
) {
  const data = getCertificateTemplateData(request, snapshot?.date_issued, snapshot);

  switch (request.certificate_type) {
    case "barangay_clearance":
      return {
        salutation: certificateTemplateSalutation(request.certificate_type),
        title: certificateTemplateTitle(request.certificate_type),
        paragraphs: [
          `This is to certify that ${data.name}, ${data.age} years old, resident of ${data.address}, Barangay Bato, Mauban, Quezon, is personally known to be a person with good moral character and has no derogatory record in this office.`,
          `This certification is issued upon request of the interested party in connection with ${data.purpose}.`,
        ],
        meta: [
          `Control No.: ${data.controlNumber}`,
          "Place Issued: Mauban, Quezon",
          `Request No.: ${data.requestNumber}`,
        ],
      };
    case "barangay_certificate":
      return {
        salutation: certificateTemplateSalutation(request.certificate_type),
        title: certificateTemplateTitle(request.certificate_type),
        paragraphs: [
          `Pinatutunayan ng tanggapang ito na si ${data.name}, ${data.age} taong gulang, ay lehitimong naninirahan sa ${data.locality}.`,
          `Ang talaang ito ay inihanda batay sa kahilingang isinumite sa sistema. Detalye ng kapanganakan: ${data.birthDetails}.`,
          `Ipinagkaloob ang pagpapatunay na ito para sa layuning ${data.purpose}.`,
        ],
        meta: [`Request No.: ${data.requestNumber}`],
      };
    case "barangay_indigency":
      return {
        salutation: certificateTemplateSalutation(request.certificate_type),
        title: certificateTemplateTitle(request.certificate_type),
        paragraphs: [
          `This certifies that ${data.name}, ${data.age} years old, is a bona fide resident of ${data.address}, Barangay Bato, Mauban, Quezon.`,
          `The above-named person belongs to an indigent family of the barangay and needs this certification for ${data.purpose}.`,
          "This certification is issued upon request for whatever legal purpose it may serve.",
        ],
        meta: [`Request No.: ${data.requestNumber}`],
      };
    case "barangay_residency":
      return {
        salutation: certificateTemplateSalutation(request.certificate_type),
        title: certificateTemplateTitle(request.certificate_type),
        paragraphs: [
          `This certifies that ${data.name}, ${data.age} years old, born on ${data.birthday}, is a bona fide resident of ${data.address}, Barangay Bato, Mauban, Quezon.`,
          `This document is issued as supporting proof of residency and authenticity showing that the applicant has been residing in the barangay for ${data.yearsOfResidency} year(s) prior to the application.`,
          `This certification is issued for ${data.purpose}.`,
        ],
        meta: [`Request No.: ${data.requestNumber}`],
      };
  }
}

export async function generateCertificatePdf({
  barangayCaptainName = "Authorized Barangay Official",
  certificateNumber,
  dateIssued = new Date().toISOString(),
  verificationCode,
  verificationExpiresAt,
  verificationUrl,
  preparedBy,
  request,
  snapshot,
}: {
  barangayCaptainName?: string;
  certificateNumber?: string;
  dateIssued?: string;
  verificationCode?: string;
  verificationExpiresAt?: string;
  verificationUrl?: string;
  preparedBy: string;
  request: CertificateRequestWithResident;
  snapshot?: CertificateSnapshot;
}) {
  const pdfDoc = await PDFDocument.create();
  const effectiveCertificateNumber = snapshot?.certificate_number ?? certificateNumber;
  const effectiveDateIssued = snapshot?.date_issued ?? dateIssued;
  pdfDoc.setTitle(
    `${certificateLabel(request.certificate_type)} - ${effectiveCertificateNumber ?? "Preview"}`,
  );
  pdfDoc.setSubject("Barangay Bato e-Certificate System thesis/demo certificate");
  pdfDoc.setKeywords([
    "Barangay Bato",
    "e-Certificate",
    effectiveCertificateNumber ?? "preview",
    verificationCode ?? "verification-preview",
    snapshot?.issued_at ?? "issued-at-preview",
    snapshot?.verification_expires_at ?? "verification-expiry-preview",
  ]);
  const page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const fonts: PdfFonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    serif: await pdfDoc.embedFont(StandardFonts.Helvetica),
  };
  const template = bodyParagraphs(request, snapshot);
  const effectivePreparedBy = snapshot?.prepared_by_display_name ?? preparedBy;
  const effectiveCaptainName =
    snapshot?.authorized_official_display_name ?? barangayCaptainName;
  const effectiveVerificationExpiresAt =
    snapshot?.verification_expires_at ?? verificationExpiresAt;

  drawWatermark(page, fonts);
  drawHeader(page, fonts);
  centerText(page, certificateLabel(request.certificate_type), 622, fonts.regular, 8);
  centerText(page, template.title, 584, fonts.bold, 16);
  drawText(page, `Certificate No.: ${effectiveCertificateNumber ?? "Pending issuance"}`, MARGIN, 646, {
    font: fonts.regular,
    size: 9,
  });

  let y = 540;
  drawText(page, template.salutation, MARGIN, y, {
    font: fonts.bold,
    size: 12,
  });
  y -= 35;

  for (const paragraph of template.paragraphs) {
    y = drawWrappedText({
      font: fonts.serif,
      lineHeight: 18,
      maxWidth: LETTER_WIDTH - MARGIN * 2,
      page,
      size: 12.5,
      text: paragraph,
      x: MARGIN,
      y,
    });
    y -= 16;
  }

  y -= 4;
  for (const item of template.meta) {
    drawText(page, item, MARGIN, y, {
      font: fonts.regular,
      size: 9.5,
    });
    y -= 15;
  }

  y -= 20;
  drawWrappedText({
    font: fonts.serif,
    lineHeight: 18,
    maxWidth: LETTER_WIDTH - MARGIN * 2,
    page,
    size: 12,
    text: `Issued this ${getCertificateTemplateData(request, effectiveDateIssued, snapshot).dateIssued} at Barangay Bato, Mauban, Quezon.`,
    x: MARGIN,
    y,
  });

  const signatureY = CERTIFICATE_LAYOUT_REGIONS.signature.y + 42;
  page.drawLine({
    start: { x: 80, y: signatureY },
    end: { x: 250, y: signatureY },
    color: rgb(0.05, 0.05, 0.05),
    thickness: 0.8,
  });
  centerTextAt(
    page,
    safePdfText(effectivePreparedBy).toUpperCase(),
    165,
    signatureY - 18,
    fonts.bold,
    10,
  );
  centerTextAt(page, "Prepared By", 165, signatureY - 32, fonts.regular, 8);

  page.drawLine({
    start: { x: 360, y: signatureY },
    end: { x: 532, y: signatureY },
    color: rgb(0.05, 0.05, 0.05),
    thickness: 0.8,
  });
  centerTextAt(
    page,
    safePdfText(effectiveCaptainName).toUpperCase(),
    446,
    signatureY - 18,
    fonts.bold,
    10,
  );
  centerTextAt(
    page,
    "Punong Barangay",
    446,
    signatureY - 32,
    fonts.regular,
    8,
  );

  page.drawRectangle({
    x: CERTIFICATE_LAYOUT_REGIONS.footer.x,
    y: CERTIFICATE_LAYOUT_REGIONS.footer.y,
    width: CERTIFICATE_LAYOUT_REGIONS.footer.width,
    height: CERTIFICATE_LAYOUT_REGIONS.footer.height,
    borderColor: rgb(0.45, 0.45, 0.45),
    borderWidth: 0.6,
  });
  centerText(
    page,
    "THESIS DEMO - NOT FOR OFFICIAL USE",
    CERTIFICATE_LAYOUT_REGIONS.footer.y + 26,
    fonts.regular,
    8,
  );

  page.drawRectangle({
    color: rgb(1, 1, 1),
    x: CERTIFICATE_LAYOUT_REGIONS.verification.x,
    y: CERTIFICATE_LAYOUT_REGIONS.verification.y,
    width: CERTIFICATE_LAYOUT_REGIONS.verification.width,
    height: CERTIFICATE_LAYOUT_REGIONS.verification.height,
    borderColor: rgb(0.45, 0.45, 0.45),
    borderWidth: 0.6,
  });
  drawText(page, "QR VERIFICATION", 342, 128, { font: fonts.bold, size: 7.5 });
  drawText(
    page,
    `Expires: ${formatPdfDateTime(effectiveVerificationExpiresAt)}`,
    342,
    113,
    { font: fonts.regular, size: 7 },
  );
  drawText(page, `Code: ${verificationCode ?? "Unavailable"}`, 342, 98, {
    font: fonts.regular,
    size: 7,
  });

  if (verificationUrl) {
    const dataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 160 });
    const png = await pdfDoc.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
    page.drawImage(png, {
      x: CERTIFICATE_LAYOUT_REGIONS.qr.x,
      y: CERTIFICATE_LAYOUT_REGIONS.qr.y,
      width: CERTIFICATE_LAYOUT_REGIONS.qr.size,
      height: CERTIFICATE_LAYOUT_REGIONS.qr.size,
    });
    drawText(page, "Scan to verify", 489, 67, { font: fonts.regular, size: 7 });
  }
  drawWrappedText({
    font: fonts.regular,
    lineHeight: 7,
    maxWidth: LETTER_WIDTH - MARGIN * 2 - 12,
    page,
    size: 6.2,
    text: "QR verification confirms issuance and status only. It does not prevent photocopying or prove that a printed copy is the only original.",
    x: MARGIN + 6,
    y: CERTIFICATE_LAYOUT_REGIONS.footer.y + 14,
  });

  // TODO: Exact positioning should be compared against final approved production prints.
  return pdfDoc.save();
}

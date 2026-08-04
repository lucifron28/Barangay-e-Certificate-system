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
  getCertificateTemplateData,
  type CertificateRequestWithResident,
} from "@/lib/certificates/template-data";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const MARGIN = 54;

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
    .replace(/[^\x20-\x7e]/g, "");
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

function bodyParagraphs(request: CertificateRequestWithResident) {
  const data = getCertificateTemplateData(request);

  switch (request.certificate_type) {
    case "barangay_clearance":
      return {
        salutation: "To whom it may concern:",
        title: "CERTIFICATION OF BARANGAY CLEARANCE",
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
        salutation: "Sa kinauukulan:",
        title: "PAGPAPATUNAY",
        paragraphs: [
          `Pinatutunayan ng tanggapang ito na si ${data.name}, ${data.age} taong gulang, ay lehitimong naninirahan sa ${data.address}, Barangay Bato, Mauban, Quezon.`,
          `Ang talaang ito ay inihanda batay sa kahilingang isinumite sa sistema. Detalye ng kapanganakan: ${data.birthDetails}.`,
          `Ipinagkaloob ang pagpapatunay na ito para sa layuning ${data.purpose}.`,
        ],
        meta: [`Request No.: ${data.requestNumber}`],
      };
    case "barangay_indigency":
      return {
        salutation: "To whom it may concern:",
        title: "CERTIFICATION OF THE BARANGAY OF INDIGENCY",
        paragraphs: [
          `This certifies that ${data.name}, ${data.age} years old, is a bona fide resident of ${data.address}, Barangay Bato, Mauban, Quezon.`,
          `The above-named person belongs to an indigent family of the barangay and needs this certification for ${data.purpose}.`,
          "This certification is issued upon request for whatever legal purpose it may serve.",
        ],
        meta: [`Request No.: ${data.requestNumber}`],
      };
    case "barangay_residency":
      return {
        salutation: "To whom it may concern:",
        title: "CERTIFICATION OF THE BARANGAY OF RESIDENCY",
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
  barangayCaptainName = "Barangay Captain Name",
  dateIssued = new Date().toISOString(),
  verificationUrl,
  preparedBy,
  request,
}: {
  barangayCaptainName?: string;
  dateIssued?: string;
  verificationUrl?: string;
  preparedBy: string;
  request: CertificateRequestWithResident;
  signatureImagePath?: string | null;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  const fonts: PdfFonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    serif: await pdfDoc.embedFont(StandardFonts.TimesRoman),
  };
  const template = bodyParagraphs(request);

  drawWatermark(page, fonts);
  drawHeader(page, fonts);
  centerText(page, certificateLabel(request.certificate_type), 622, fonts.regular, 8);
  centerText(page, template.title, 584, fonts.bold, 16);

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
    text: `Issued this ${getCertificateTemplateData(request, dateIssued).dateIssued} at Barangay Bato, Mauban, Quezon.`,
    x: MARGIN,
    y,
  });

  const signatureY = 160;
  page.drawLine({
    start: { x: 80, y: signatureY },
    end: { x: 250, y: signatureY },
    color: rgb(0.05, 0.05, 0.05),
    thickness: 0.8,
  });
  centerTextAt(
    page,
    safePdfText(preparedBy).toUpperCase(),
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
    safePdfText(barangayCaptainName).toUpperCase(),
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
    x: MARGIN,
    y: 72,
    width: LETTER_WIDTH - MARGIN * 2,
    height: 34,
    borderColor: rgb(0.45, 0.45, 0.45),
    borderWidth: 0.6,
  });
  centerText(
    page,
    "Electronic signature display is a thesis/demo visual placeholder only.",
    91,
    fonts.regular,
    8,
  );

  if (verificationUrl) {
    const dataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 160 });
    const png = await pdfDoc.embedPng(Buffer.from(dataUrl.split(",")[1], "base64"));
    page.drawImage(png, { x: 460, y: 112, width: 72, height: 72 });
    drawText(page, "Scan to verify", 454, 101, { font: fonts.regular, size: 7 });
  }
  centerText(
    page,
    "Official stamp remains a physical process.",
    79,
    fonts.regular,
    8,
  );

  // TODO: Exact positioning should be compared against final approved production prints.
  // TODO: If the client approves storage-backed assets, move final PDF/template assets to Supabase Storage.
  return pdfDoc.save();
}

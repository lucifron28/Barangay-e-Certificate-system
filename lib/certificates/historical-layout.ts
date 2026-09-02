import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PDFDocument,
  type PDFImage,
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
import { normalizePdfText } from "@/lib/certificates/pdf-text";
import {
  embedSignatureImage,
  fitSignatureImage,
} from "@/lib/certificates/pdf-signature";
import type { SignatureImagePayload } from "@/lib/certificates/signature-storage";
import type { CertificateSnapshot } from "@/types/database";
import type { CertificateType } from "@/types/enums";

const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const OFFICE_BLUE = rgb(0.22, 0.45, 0.72);
const BODY_COLOR = rgb(0.04, 0.04, 0.04);
const WATERMARK_COLOR = rgb(0.82, 0.82, 0.82);
const META_COLOR = rgb(0.28, 0.28, 0.28);
const WATERMARK_OPACITY = 0.2;

const HISTORICAL_WATERMARK_CONFIG: Record<
  HistoricalCertificateType,
  { centerY: number; size: number }
> = {
  barangay_clearance: { centerY: 408, size: 560 },
  barangay_certificate: { centerY: 396, size: 468 },
  barangay_indigency: { centerY: 396, size: 468 },
  barangay_residency: { centerY: 396, size: 468 },
};

export type HistoricalCertificateType =
  | "barangay_clearance"
  | "barangay_certificate"
  | "barangay_indigency"
  | "barangay_residency";

export const HISTORICAL_CERTIFICATE_TYPES: readonly HistoricalCertificateType[] =
  [
    "barangay_clearance",
    "barangay_certificate",
    "barangay_indigency",
    "barangay_residency",
  ];

export function isHistoricalCertificateType(
  certificateType: CertificateType,
): certificateType is HistoricalCertificateType {
  return HISTORICAL_CERTIFICATE_TYPES.includes(
    certificateType as HistoricalCertificateType,
  );
}

export const HISTORICAL_LAYOUT_REGIONS = {
  footer: { height: 20, y: 11 },
  signature: { height: 82, y: 168 },
  verification: { height: 58, y: 38 },
} as const;

export class HistoricalCertificatePdfLayoutError extends Error {
  constructor(
    message =
      "Historical certificate details are too long for the printable body area.",
  ) {
    super(message);
    this.name = "HistoricalCertificatePdfLayoutError";
  }
}

export type HistoricalCertificateBodyLayout = {
  bodyFontSize: number;
  bodyLineHeight: number;
  endY: number;
  issueFontSize: number;
  issueGap: number;
  issueLineHeight: number;
  paragraphGap: number;
};

type HistoricalFonts = {
  bold: PDFFont;
  regular: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
};

type HistoricalTextRun = {
  bold?: boolean;
  text: string;
};

type HistoricalParagraph = HistoricalTextRun[];

type HistoricalTemplateConfig = {
  bodyBottom: number;
  bodyMaxWidth: number;
  bodyStartY: number;
  headerLines: string[];
  headerStartY: number;
  officeTitle: string;
  officeY: number;
  paperFieldsY?: number;
  salutation: string;
  salutationY: number;
  sealY: number;
  signatureLabel: string;
  signatureRole: string;
  signatureX: number;
  signatureY: number;
  title: string;
  titleY: number;
};

const HISTORICAL_TEMPLATE_CONFIG: Record<
  HistoricalCertificateType,
  HistoricalTemplateConfig
> = {
  barangay_clearance: {
    bodyBottom: 392,
    bodyMaxWidth: 540,
    bodyStartY: 522,
    headerLines: [
      "Republic of the Philippines",
      "Province of Quezon",
      "Municipality of Mauban",
      "Barangay BATO",
    ],
    headerStartY: 746,
    officeTitle: "OFFICE OF THE BARANGAY CHAIRMAN",
    officeY: 650,
    paperFieldsY: 212,
    salutation: "To whom it may concern:",
    salutationY: 553,
    sealY: 733,
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
    signatureX: 430,
    signatureY: 306,
    title: "CERTIFICATION OF CLEARANCE",
    titleY: 606,
  },
  barangay_certificate: {
    bodyBottom: 328,
    bodyMaxWidth: 468,
    bodyStartY: 492,
    headerLines: [
      "Republic of the Philippines",
      "Municipality of Mauban",
      "Province of Quezon",
      "Barangay BATO",
    ],
    headerStartY: 706,
    officeTitle: "TANGGAPAN NG PUNONG BARANGAY",
    officeY: 602,
    salutation: "Sa kinauukulan:",
    salutationY: 540,
    sealY: 700,
    signatureLabel: "Pinatunayan ni:",
    signatureRole: "Punong Barangay",
    signatureX: 446,
    signatureY: 278,
    title: "PAGPAPATUNAY",
    titleY: 566,
  },
  barangay_indigency: {
    bodyBottom: 286,
    bodyMaxWidth: 488,
    bodyStartY: 430,
    headerLines: [
      "Republic of the Philippines",
      "Municipality of Mauban",
      "Province of Quezon",
      "Barangay BATO",
    ],
    headerStartY: 690,
    officeTitle: "OFFICE OF THE BARANGAY CHAIRMAN",
    officeY: 608,
    salutation: "To Whom it may concern,",
    salutationY: 474,
    sealY: 686,
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
    signatureX: 438,
    signatureY: 177,
    title: "CERTIFICATION OF INDIGENCY",
    titleY: 554,
  },
  barangay_residency: {
    bodyBottom: 294,
    bodyMaxWidth: 488,
    bodyStartY: 455,
    headerLines: [
      "Republic of the Philippines",
      "Municipality of Mauban",
      "Province of Quezon",
      "Barangay BATO",
    ],
    headerStartY: 690,
    officeTitle: "OFFICE OF THE BARANGAY CHAIRMAN",
    officeY: 565,
    salutation: "To Whom it may concern,",
    salutationY: 494,
    sealY: 686,
    signatureLabel: "Certified by:",
    signatureRole: "Barangay Chairman",
    signatureX: 438,
    signatureY: 188,
    title: "CERTIFICATION OF RESIDENCY",
    titleY: 532,
  },
};

const BODY_LAYOUT_OPTIONS = [
  {
    bodyFontSize: 12.5,
    bodyLineHeight: 17,
    issueFontSize: 12,
    issueLineHeight: 16,
    paragraphGap: 16,
    issueGap: 18,
  },
  {
    bodyFontSize: 11.5,
    bodyLineHeight: 15,
    issueFontSize: 10.5,
    issueLineHeight: 14,
    paragraphGap: 12,
    issueGap: 14,
  },
  {
    bodyFontSize: 10.5,
    bodyLineHeight: 13,
    issueFontSize: 9.5,
    issueLineHeight: 12,
    paragraphGap: 9,
    issueGap: 10,
  },
  {
    bodyFontSize: 9.5,
    bodyLineHeight: 11,
    issueFontSize: 8.5,
    issueLineHeight: 10,
    paragraphGap: 6,
    issueGap: 8,
  },
] as const;

const safePdfText = normalizePdfText;

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
  color: RGB = BODY_COLOR,
) {
  const normalized = safePdfText(text);
  page.drawText(normalized, {
    color,
    font,
    size,
    x: (LETTER_WIDTH - font.widthOfTextAtSize(normalized, size)) / 2,
    y,
  });
}

function centerTextAt(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = BODY_COLOR,
) {
  const normalized = safePdfText(text);
  page.drawText(normalized, {
    color,
    font,
    size,
    x: centerX - font.widthOfTextAtSize(normalized, size) / 2,
    y,
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = BODY_COLOR,
) {
  page.drawText(safePdfText(text), { color, font, size, x, y });
}

function drawFittedCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  color: RGB = BODY_COLOR,
) {
  const normalized = safePdfText(text);
  let fittedSize = size;
  while (
    fittedSize > 7 &&
    font.widthOfTextAtSize(normalized, fittedSize) > maxWidth
  ) {
    fittedSize -= 0.5;
  }
  page.drawText(normalized, {
    color,
    font,
    size: fittedSize,
    x: centerX - font.widthOfTextAtSize(normalized, fittedSize) / 2,
    y,
  });
}

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const parts: string[] = [];
  let current = "";
  for (const character of word) {
    const next = `${current}${character}`;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function lineWidth(
  line: HistoricalTextRun[],
  fonts: HistoricalFonts,
  size: number,
) {
  return line.reduce(
    (width, run) =>
      width +
      fonts[run.bold ? "bold" : "regular"].widthOfTextAtSize(
        safePdfText(run.text),
        size,
      ),
    0,
  );
}

function wrapRuns(
  runs: HistoricalParagraph,
  fonts: HistoricalFonts,
  size: number,
  maxWidth: number,
) {
  const lines: HistoricalParagraph[] = [[]];
  let pendingSpace = false;

  const appendToken = (token: string, bold: boolean) => {
    const font = fonts[bold ? "bold" : "regular"];
    let currentLine = lines[lines.length - 1];
    const prefix = pendingSpace && currentLine.length ? " " : "";
    const combined = `${prefix}${token}`;

    if (
      currentLine.length &&
      lineWidth(currentLine, fonts, size) +
        font.widthOfTextAtSize(safePdfText(combined), size) >
        maxWidth
    ) {
      lines.push([]);
      currentLine = lines[lines.length - 1];
    }

    if (font.widthOfTextAtSize(safePdfText(token), size) > maxWidth) {
      if (currentLine.length) {
        lines.push([]);
      }
      const chunks = splitLongWord(safePdfText(token), font, size, maxWidth);
      chunks.forEach((chunk, index) => {
        if (index > 0) lines.push([]);
        lines[lines.length - 1].push({ bold, text: chunk });
      });
    } else {
      currentLine.push({ bold, text: combined });
    }

    pendingSpace = false;
  };

  for (const run of runs) {
    const tokens = safePdfText(run.text).match(/\s+|[^\s]+/g) ?? [];
    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        pendingSpace = true;
      } else {
        appendToken(token, Boolean(run.bold));
      }
    }
  }

  return lines.filter((line) => line.length > 0);
}

function drawWrappedRuns({
  fonts,
  lineHeight,
  maxWidth,
  page,
  size,
  text,
  x,
  y,
}: {
  fonts: HistoricalFonts;
  lineHeight: number;
  maxWidth: number;
  page: PDFPage;
  size: number;
  text: HistoricalParagraph;
  x: number;
  y: number;
}) {
  let currentY = y;
  const lines = wrapRuns(text, fonts, size, maxWidth);

  for (const line of lines) {
    let currentX = x;
    for (const run of line) {
      const font = fonts[run.bold ? "bold" : "regular"];
      const normalized = safePdfText(run.text);
      page.drawText(normalized, {
        color: BODY_COLOR,
        font,
        size,
        x: currentX,
        y: currentY,
      });
      currentX += font.widthOfTextAtSize(normalized, size);
    }
    currentY -= lineHeight;
  }

  return currentY;
}

function buildHistoricalBody(
  type: HistoricalCertificateType,
  request: CertificateRequestWithResident,
  dateIssued: string,
  snapshot?: CertificateSnapshot,
) {
  const data = getCertificateTemplateData(request, dateIssued, snapshot);
  const residentLocality = formatResidentLocality(data.address);
  const regular = (text: string): HistoricalTextRun => ({ text });
  const bold = (text: string): HistoricalTextRun => ({ bold: true, text });

  switch (type) {
    case "barangay_clearance":
      return {
        issue: [
          regular(
            `Issued upon request of the interested party this ${data.dateIssued} at the Office of the Sangguniang Barangay of Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(
              `, ${data.age} years old whose signature appears below is a bona fide resident of `,
            ),
            bold(residentLocality),
            regular(
              " and personally known to be a person of good moral character and has no criminal record in this office.",
            ),
          ],
          [
            regular(
              "This Certification is being issued in connection to his/her ",
            ),
            bold(data.purpose),
            regular(" and for whatever legal purpose it may serve."),
          ],
        ],
      };
    case "barangay_certificate":
      return {
        issue: [
          regular(
            `Ipinagkaloob ngayong ${data.dateIssued} sa tanggapan ng Punong Barangay ng Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("Pinatutunayan ng tanggapan na ito na si "),
            bold(data.name),
            regular(", "),
            bold(data.age),
            regular(" taong gulang, ay ipinanganak sa "),
            bold(data.birthDetails),
            regular(" at lehitimong naninirahan sa "),
            bold(residentLocality),
            regular("."),
          ],
          [
            regular(
              "Ang pagpapatunay na ito ay ipinagkakaloob sa kahilingan ng nasabing tao para sa layuning ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
    case "barangay_indigency":
      return {
        issue: [
          regular(
            `This certification is being issued this ${data.dateIssued} for whatever legal purpose it may serve.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(`, ${data.age} years old, is a bona fide resident of `),
            bold(residentLocality),
            regular("."),
          ],
          [
            regular(
              "This certifies that the above-named person belongs to an indigent family of the barangay and needs this certification for ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
    case "barangay_residency":
      return {
        issue: [
          regular(
            `Issued this ${data.dateIssued} at Barangay Bato, Mauban, Quezon.`,
          ),
        ],
        paragraphs: [
          [
            regular("This is to certify that "),
            bold(data.name),
            regular(", "),
            bold(data.age),
            regular(" years old born on "),
            bold(data.birthday),
            regular(" is a bona fide resident of "),
            bold(residentLocality),
            regular(" and has been residing in the barangay for "),
            bold(data.yearsOfResidency),
            regular(" year(s) up to present."),
          ],
          [
            regular(
              "This undersigned has certified that after a reasonable inquiry, I have verified the authenticity of Barangay residency showing that the applicant has been residing in the barangay for at least six (6) months prior to the application of this Affidavit of Residency.",
            ),
          ],
          [
            regular(
              "This Certification is issued upon the request of the above named person as a supporting document for ",
            ),
            bold(data.purpose),
            regular("."),
          ],
        ],
      };
  }
}

function formatResidentLocality(address: string) {
  const value = address.trim();
  const normalized = value.toLowerCase();
  const parts = value ? [value] : [];
  if (!normalized.includes("barangay bato")) parts.push("Barangay Bato");
  if (!normalized.includes("mauban")) parts.push("Mauban");
  if (!normalized.includes("quezon")) parts.push("Quezon");
  return parts.join(", ");
}

function getTemplateConfig(type: HistoricalCertificateType) {
  return HISTORICAL_TEMPLATE_CONFIG[type];
}

function selectHistoricalBodyLayout(
  type: HistoricalCertificateType,
  request: CertificateRequestWithResident,
  dateIssued: string,
  fonts: HistoricalFonts,
  snapshot?: CertificateSnapshot,
): HistoricalCertificateBodyLayout {
  const config = getTemplateConfig(type);
  const body = buildHistoricalBody(type, request, dateIssued, snapshot);

  for (const option of BODY_LAYOUT_OPTIONS) {
    let y = config.bodyStartY;
    for (const paragraph of body.paragraphs) {
      y -=
        wrapRuns(paragraph, fonts, option.bodyFontSize, config.bodyMaxWidth)
          .length * option.bodyLineHeight;
      y -= option.paragraphGap;
    }
    y -= option.issueGap;
    const endY =
      y -
      wrapRuns(body.issue, fonts, option.issueFontSize, config.bodyMaxWidth)
        .length *
        option.issueLineHeight;

    if (endY >= config.bodyBottom) {
      return { ...option, endY };
    }
  }

  throw new HistoricalCertificatePdfLayoutError(
    "Historical certificate details are too long for the printable body area. Shorten the resident name, address, or purpose and try again.",
  );
}

export async function calculateHistoricalCertificateBodyLayout(input: {
  dateIssued?: string;
  request: CertificateRequestWithResident;
  snapshot?: CertificateSnapshot;
}) {
  const pdfDoc = await PDFDocument.create();
  const fonts: HistoricalFonts = {
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    sans: await pdfDoc.embedFont(StandardFonts.Helvetica),
    sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const effectiveDateIssued =
    input.snapshot?.date_issued ?? input.dateIssued ?? new Date().toISOString();

  return selectHistoricalBodyLayout(
    input.request.certificate_type as HistoricalCertificateType,
    input.request,
    effectiveDateIssued,
    fonts,
    input.snapshot,
  );
}

function drawFallbackSeal(
  page: PDFPage,
  centerX: number,
  centerY: number,
  label: string,
  fonts: HistoricalFonts,
  radius = 35,
) {
  const border = rgb(0.28, 0.34, 0.28);
  page.drawEllipse({
    borderColor: border,
    borderWidth: 1.2,
    color: rgb(0.98, 0.98, 0.95),
    x: centerX,
    xScale: radius,
    y: centerY,
    yScale: radius,
  });
  page.drawEllipse({
    borderColor: border,
    borderWidth: 0.8,
    x: centerX,
    xScale: radius - 5,
    y: centerY,
    yScale: radius - 5,
  });
  centerTextAt(page, label, centerX, centerY + 11, fonts.sansBold, 5.5, border);
  centerTextAt(
    page,
    "SEAL PLACEHOLDER",
    centerX,
    centerY - 3,
    fonts.sans,
    5,
    border,
  );
  centerTextAt(
    page,
    "BARANGAY BATO",
    centerX,
    centerY - 16,
    fonts.sansBold,
    4.7,
    border,
  );
}

type EmbeddedSealImages = {
  barangayBato: PDFImage;
  mauban: PDFImage;
};

async function embedSealImages(
  pdfDoc: PDFDocument,
): Promise<EmbeddedSealImages | null> {
  try {
    const brandingDirectory = join(process.cwd(), "public", "branding");
    const [maubanBytes, barangayBatoBytes] = await Promise.all([
      readFile(join(brandingDirectory, "mauban-seal.png")),
      readFile(join(brandingDirectory, "barangay-bato-seal.png")),
    ]);

    return {
      barangayBato: await pdfDoc.embedPng(barangayBatoBytes),
      mauban: await pdfDoc.embedPng(maubanBytes),
    };
  } catch {
    return null;
  }
}

function drawWatermark(
  page: PDFPage,
  watermark: PDFImage | null,
  type: HistoricalCertificateType,
  fonts: HistoricalFonts,
) {
  const config = HISTORICAL_WATERMARK_CONFIG[type];

  if (watermark) {
    page.drawImage(watermark, {
      height: config.size,
      opacity: WATERMARK_OPACITY,
      width: config.size,
      x: (LETTER_WIDTH - config.size) / 2,
      y: config.centerY - config.size / 2,
    });
    return;
  }

  page.drawEllipse({
    borderColor: WATERMARK_COLOR,
    borderWidth: 7,
    x: LETTER_WIDTH / 2,
    xScale: config.size / 2,
    y: config.centerY,
    yScale: config.size / 2,
  });
  page.drawEllipse({
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1.5,
    x: LETTER_WIDTH / 2,
    xScale: config.size / 2 - 31,
    y: config.centerY,
    yScale: config.size / 2 - 31,
  });
  centerTextAt(
    page,
    "BARANGAY BATO",
    LETTER_WIDTH / 2,
    config.centerY + config.size / 2 - 70,
    fonts.bold,
    31,
    WATERMARK_COLOR,
  );
  centerTextAt(
    page,
    "MAUBAN, QUEZON",
    LETTER_WIDTH / 2,
    config.centerY - config.size / 2 + 55,
    fonts.bold,
    25,
    WATERMARK_COLOR,
  );
}

function drawHeader(
  page: PDFPage,
  config: HistoricalTemplateConfig,
  fonts: HistoricalFonts,
  seals: EmbeddedSealImages | null,
) {
  // TODO: Confirm final seal size and exact print positioning against the approved certificate template.
  if (seals) {
    page.drawImage(seals.mauban, {
      height: 70,
      width: 70,
      x: 73,
      y: config.sealY - 35,
    });
    page.drawImage(seals.barangayBato, {
      height: 70,
      width: 70,
      x: 469,
      y: config.sealY - 35,
    });
  } else {
    drawFallbackSeal(page, 108, config.sealY, "BAYAN NG MAUBAN", fonts, 35);
    drawFallbackSeal(page, 504, config.sealY, "BARANGAY BATO", fonts, 35);
  }

  config.headerLines.forEach((line, index) => {
    centerText(
      page,
      line,
      config.headerStartY - index * 16,
      fonts.regular,
      11.5,
    );
  });
  centerText(
    page,
    config.officeTitle,
    config.officeY,
    fonts.bold,
    19,
    OFFICE_BLUE,
  );
  centerText(page, config.title, config.titleY, fonts.bold, 17);
}

function drawSignature(
  page: PDFPage,
  config: HistoricalTemplateConfig,
  captainName: string,
  fonts: HistoricalFonts,
  signatureImage?: PDFImage | null,
) {
  const lineY = config.signatureY;
  const lineStart = config.signatureX - 90;
  const lineEnd = config.signatureX + 90;

  centerTextAt(
    page,
    config.signatureLabel,
    config.signatureX,
    lineY + 43,
    fonts.bold,
    14,
  );
  if (signatureImage) {
    const imageSize = fitSignatureImage(signatureImage, 135, 44);
    page.drawImage(signatureImage, {
      height: imageSize.height,
      width: imageSize.width,
      x: config.signatureX - imageSize.width / 2,
      y: lineY + 4,
    });
  }
  page.drawLine({
    color: BODY_COLOR,
    start: { x: lineStart, y: lineY + 10 },
    end: { x: lineEnd, y: lineY + 10 },
    thickness: 0.8,
  });
  drawFittedCenteredText(
    page,
    captainName.toUpperCase(),
    config.signatureX,
    lineY - 1,
    fonts.bold,
    12,
    190,
  );
  centerTextAt(
    page,
    config.signatureRole,
    config.signatureX,
    lineY - 19,
    fonts.bold,
    10,
  );
}

function drawClearancePaperFields(
  page: PDFPage,
  y: number,
  fonts: HistoricalFonts,
) {
  const field = (label: string, lineWidth: number, fieldY: number) => {
    drawText(page, `${label}:`, 28, fieldY, fonts.regular, 9.5);
    page.drawLine({
      color: BODY_COLOR,
      start: {
        x: 28 + fonts.regular.widthOfTextAtSize(`${label}:`, 9.5) + 4,
        y: fieldY - 1,
      },
      end: { x: 28 + lineWidth, y: fieldY - 1 },
      thickness: 0.5,
    });
  };

  field("CTC No.", 128, y);
  field("DATE OF ISSUED", 165, y - 17);
  drawText(
    page,
    "PLACE OF ISSUED: Mauban, Quezon",
    28,
    y - 34,
    fonts.regular,
    9.5,
  );
  field("O.R. No.", 128, y - 51);
}

async function drawVerificationLayer({
  certificateNumber,
  controlNumber,
  fonts,
  page,
  requestNumber,
  verificationCode,
  verificationExpiresAt,
  verificationUrl,
  pdfDoc,
}: {
  certificateNumber: string;
  controlNumber: string | null;
  fonts: HistoricalFonts;
  page: PDFPage;
  requestNumber: string;
  verificationCode?: string;
  verificationExpiresAt?: string;
  verificationUrl?: string;
  pdfDoc: PDFDocument;
}) {
  const x = 54;
  const y = HISTORICAL_LAYOUT_REGIONS.verification.y;
  const width = 388;
  const height = HISTORICAL_LAYOUT_REGIONS.verification.height;

  page.drawRectangle({
    borderColor: rgb(0.72, 0.72, 0.72),
    borderWidth: 0.45,
    x,
    y,
    width,
    height,
  });
  drawText(
    page,
    "DIGITAL VERIFICATION (SECONDARY)",
    x + 8,
    y + 43,
    fonts.sansBold,
    6.5,
    META_COLOR,
  );
  drawText(
    page,
    `Certificate No.: ${certificateNumber}`,
    x + 8,
    y + 31,
    fonts.sans,
    6.5,
    META_COLOR,
  );
  drawText(
    page,
    `Request No.: ${requestNumber}`,
    x + 8,
    y + 20,
    fonts.sans,
    6.5,
    META_COLOR,
  );
  drawText(
    page,
    `Control No.: ${controlNumber ?? "Not applicable"}`,
    x + 8,
    y + 9,
    fonts.sans,
    6.5,
    META_COLOR,
  );
  drawText(
    page,
    `Code: ${verificationCode ?? "Unavailable"}`,
    x + 205,
    y + 31,
    fonts.sans,
    6.5,
    META_COLOR,
  );
  drawText(
    page,
    `Expires: ${formatPdfDateTime(verificationExpiresAt)}`,
    x + 205,
    y + 20,
    fonts.sans,
    6.5,
    META_COLOR,
  );

  if (verificationUrl) {
    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 120,
    });
    const png = await pdfDoc.embedPng(
      Buffer.from(dataUrl.split(",")[1], "base64"),
    );
    page.drawImage(png, {
      height: 48,
      width: 48,
      x: 496,
      y: 43,
    });
    drawText(page, "Scan to verify", 491, 34, fonts.sans, 6, META_COLOR);
  }

  centerText(
    page,
    "System record verification does not establish physical-document originality.",
    HISTORICAL_LAYOUT_REGIONS.footer.y,
    fonts.sans,
    6.5,
    META_COLOR,
  );
}

export async function generateHistoricalCertificatePdf({
  barangayCaptainName = "DIOGENES E. MANAOG",
  certificateNumber,
  dateIssued = new Date().toISOString(),
  preparedBy,
  request,
  signatureImage,
  snapshot,
  verificationCode,
  verificationExpiresAt,
  verificationUrl,
}: {
  barangayCaptainName?: string;
  certificateNumber?: string;
  dateIssued?: string;
  preparedBy: string;
  request: CertificateRequestWithResident;
  signatureImage?: SignatureImagePayload;
  snapshot?: CertificateSnapshot;
  verificationCode?: string;
  verificationExpiresAt?: string;
  verificationUrl?: string;
}) {
  const type = request.certificate_type as HistoricalCertificateType;
  const config = getTemplateConfig(type);
  const pdfDoc = await PDFDocument.create();
  const embeddedSignatureImage = await embedSignatureImage(pdfDoc, signatureImage);
  const seals = await embedSealImages(pdfDoc);
  const effectiveCertificateNumber =
    snapshot?.certificate_number ?? certificateNumber;
  const effectiveDateIssued = snapshot?.date_issued ?? dateIssued;
  const effectiveCaptainName =
    snapshot?.authorized_official_display_name ?? barangayCaptainName;
  // The preparer remains in the issuance snapshot and database audit record;
  // the official printable layout intentionally shows only the authorized signer.
  void preparedBy;
  const effectiveVerificationExpiresAt =
    snapshot?.verification_expires_at ?? verificationExpiresAt;
  const data = getCertificateTemplateData(
    request,
    effectiveDateIssued,
    snapshot,
  );
  const fonts: HistoricalFonts = {
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    sans: await pdfDoc.embedFont(StandardFonts.Helvetica),
    sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
  const layout = selectHistoricalBodyLayout(
    type,
    request,
    effectiveDateIssued,
    fonts,
    snapshot,
  );
  const body = buildHistoricalBody(
    type,
    request,
    effectiveDateIssued,
    snapshot,
  );

  pdfDoc.setTitle(
    `${certificateLabel(request.certificate_type)} - ${effectiveCertificateNumber ?? "Preview"}`,
  );
  pdfDoc.setSubject("Barangay Bato e-Certificate System certificate");
  pdfDoc.setKeywords([
    "Barangay Bato",
    "e-Certificate",
    effectiveCertificateNumber ?? "preview",
    data.requestNumber,
    data.controlNumber,
    verificationCode ?? "verification-preview",
  ]);

  const page = pdfDoc.addPage([LETTER_WIDTH, LETTER_HEIGHT]);
  drawWatermark(page, seals?.barangayBato ?? null, type, fonts);
  drawHeader(page, config, fonts, seals);
  drawText(page, config.salutation, 72, config.salutationY, fonts.bold, 17);

  let y = config.bodyStartY;
  for (const paragraph of body.paragraphs) {
    y = drawWrappedRuns({
      fonts,
      lineHeight: layout.bodyLineHeight,
      maxWidth: config.bodyMaxWidth,
      page,
      size: layout.bodyFontSize,
      text: paragraph,
      x: config.bodyMaxWidth === 540 ? 28 : 72,
      y,
    });
    y -= layout.paragraphGap;
  }

  y -= layout.issueGap;
  drawWrappedRuns({
    fonts,
    lineHeight: layout.issueLineHeight,
    maxWidth: config.bodyMaxWidth,
    page,
    size: layout.issueFontSize,
    text: body.issue,
    x: config.bodyMaxWidth === 540 ? 28 : 72,
    y,
  });

  drawSignature(
    page,
    config,
    effectiveCaptainName,
    fonts,
    embeddedSignatureImage,
  );
  if (config.paperFieldsY) {
    drawClearancePaperFields(page, config.paperFieldsY, fonts);
  }

  await drawVerificationLayer({
    certificateNumber: effectiveCertificateNumber ?? "Pending issuance",
    controlNumber: data.controlNumber === "Pending" ? null : data.controlNumber,
    fonts,
    page,
    requestNumber: data.requestNumber,
    verificationCode,
    verificationExpiresAt: effectiveVerificationExpiresAt,
    verificationUrl,
    pdfDoc,
  });

  // TODO: Compare exact seal assets and final print positioning against client-approved production templates.
  return pdfDoc.save();
}

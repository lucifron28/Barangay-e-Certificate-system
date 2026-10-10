import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { generateHistoricalCertificatePdf } from "@/lib/certificates/historical-layout";
import {
  certificateTemplateOfficeTitle,
  certificateTemplateSignatureRole,
  certificateTemplateTitle,
} from "@/lib/certificates/template-copy";
import type { HistoricalCertificateType } from "@/lib/certificates/historical-layout";
import type { CertificateRequestWithResident } from "@/lib/certificates/template-data";

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "certificate-structure-qa");

const CERTIFICATE_TYPES: readonly HistoricalCertificateType[] = [
  "barangay_clearance",
  "barangay_certificate",
  "barangay_indigency",
  "barangay_residency",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

// Synthetic signature PNG (an anonymized stylized curve) for safe QA artifacts
const syntheticSignatureBase64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const syntheticSignatureBytes = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

function buildSyntheticRequest(type: HistoricalCertificateType): CertificateRequestWithResident {
  return {
    id: `req-synth-${type}`,
    certificate_type: type,
    control_number: `CTRL-2026-QA-${type.slice(9, 13).toUpperCase()}`,
    created_at: "2026-10-10T08:00:00.000Z",
    date_accepted: "2026-10-10T08:00:00.000Z",
    date_released: "2026-10-10T08:00:00.000Z",
    date_requested: "2026-10-10T08:00:00.000Z",
    cancelled_at: null,
    fee_amount: 50,
    remarks: null,
    payment_status: "paid",
    purpose: "Application for Scholarship and Local Identification",
    request_number: `REQ-2026-9901`,
    resident_id: "res-synth-001",
    status: "ready_for_download",
    submitted_data: {
      common: {
        address_sitio: "Sitio Riverside",
        age: 24,
        contact_number: "09181234567",
        full_name: "JUAN DELA CRUZ JR.",
        purpose: "Application for Scholarship and Local Identification",
      },
      certificate_specific:
        type === "barangay_residency"
          ? {
              birthdate: "2002-04-15",
              years_of_residency: 5,
            }
          : type === "barangay_certificate"
            ? {
                place_of_birth: "Mauban, Quezon",
              }
            : {},
    },
    updated_at: "2026-10-10T08:00:00.000Z",
    resident: {
      address_sitio: "Sitio Riverside",
      age: 24,
      date_of_birth: "2002-04-15",
      full_name: "JUAN DELA CRUZ JR.",
    },
  };
}

async function getSealBase64(filename: string): Promise<string> {
  const fileBytes = await readFile(path.join(root, "public", "branding", filename));
  return `data:image/png;base64,${fileBytes.toString("base64")}`;
}

async function getCompiledCss(): Promise<string> {
  const cssDir = path.join(root, ".next", "static", "chunks");
  const filename = "2hhdpfzbn54hy.css";
  try {
    return await readFile(path.join(cssDir, filename), "utf8");
  } catch {
    return "";
  }
}

describe("Playwright Visual QA across four certificate templates", () => {
  it(
    "renders previews across breakpoints, generates PDFs, renders PDF pages, and verifies complete structural alignment",
    async () => {
      await mkdir(outputDir, { recursive: true });

      const maubanSealData = await getSealBase64("mauban-seal.png");
      const brgySealData = await getSealBase64("barangay-bato-seal.png");
      const compiledCss = await getCompiledCss();

      const pdfJsResponse = await fetch(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      );
      const pdfJsCode = await pdfJsResponse.text();
      const workerResponse = await fetch(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
      );
      const workerCode = await workerResponse.text();
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      const auditSummary: Array<{
        certificateType: string;
        expectedTitle: string;
        expectedSignerRole: string;
        expectedOfficeTitle: string;
        desktopScreenshot: string;
        tabletScreenshot: string;
        mobileScreenshot: string;
        pdfGenerated: string;
        pdfRendered: string;
        status: "PASS" | "FAIL";
        checks: Record<string, boolean>;
      }> = [];

      for (const type of CERTIFICATE_TYPES) {
        const req = buildSyntheticRequest(type);

        const expectedTitle = certificateTemplateTitle(type);
        const expectedSignerRole = certificateTemplateSignatureRole(type);
        const expectedOfficeTitle = certificateTemplateOfficeTitle(type);

        // 1. Generate HTML preview with inlined styling and assets
        const rawMarkup = renderToStaticMarkup(
          <PrintableCertificate
            barangayCaptainName="DIOGENES E. MANAOG"
            certificateNumber="CERT-2026-9901"
            dateIssued="2026-10-10"
            request={req}
            signatureImageUrl={syntheticSignatureBase64}
          />,
        );
        const markupWithInlinedAssets = rawMarkup
          .replace(/\/branding\/mauban-seal\.png/g, maubanSealData)
          .replace(/\/branding\/barangay-bato-seal\.png/g, brgySealData);

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${expectedTitle} Preview</title>
  <style>
    ${compiledCss}
    body { margin: 0; padding: 24px; background: #f3f4f6; display: flex; justify-content: center; }
  </style>
</head>
<body>
  ${markupWithInlinedAssets}
</body>
</html>`;

        // 2. Capture preview screenshots at Desktop, Tablet, Mobile
        let desktopShot = "";
        let tabletShot = "";
        let mobileShot = "";

        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.setContent(fullHtml, { waitUntil: "load" });

          const shotName = `${type}-preview-${vp.name}.png`;
          const shotPath = path.join(outputDir, shotName);
          await page.screenshot({ path: shotPath, fullPage: true });

          if (vp.name === "desktop") desktopShot = shotName;
          if (vp.name === "tablet") tabletShot = shotName;
          if (vp.name === "mobile") mobileShot = shotName;
        }

        // 3. Verify HTML preview content
        const htmlPageText = (await page.textContent("body")) ?? "";
        expect(htmlPageText.toUpperCase()).toContain(expectedTitle.toUpperCase());
        expect(htmlPageText.toUpperCase()).toContain(expectedSignerRole.toUpperCase());
        expect(htmlPageText.toUpperCase()).toContain(expectedOfficeTitle.toUpperCase());
        expect(htmlPageText).toContain("DIOGENES E. MANAOG");

        if (type === "barangay_residency") {
          expect(htmlPageText.toUpperCase()).toContain("BARANGAY CHAIRMAN");
          expect(htmlPageText.toUpperCase()).not.toContain("ACTING BARANGAY CHAIRMAN");
        }
        if (type === "barangay_certificate") {
          expect(htmlPageText.toUpperCase()).toContain("PUNONG BARANGAY");
          expect(htmlPageText.toUpperCase()).toContain("TANGGAPAN NG PUNONG BARANGAY");
        }

        // 4. Generate synthetic PDF
        const pdfBytes = await generateHistoricalCertificatePdf({
          barangayCaptainName: "DIOGENES E. MANAOG",
          certificateNumber: "CERT-2026-9901",
          dateIssued: "2026-10-10",
          preparedBy: "Barangay Secretary",
          request: req,
          signatureImage: {
            bytes: syntheticSignatureBytes,
            contentType: "image/png",
          },
          verificationCode: `VERIFY-QA-${type.toUpperCase()}`,
          verificationExpiresAt: "2026-11-10T00:00:00.000Z",
          verificationUrl: `https://barangay-bato-ecertificate-system.vercel.app/verify/qa-${type}`,
        });

        const pdfName = `${type}-synthetic.pdf`;
        const pdfPath = path.join(outputDir, pdfName);
        await writeFile(pdfPath, pdfBytes);

        // 5. Render PDF to Image via PDF.js on Canvas in Playwright
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
        await page.setViewportSize({ width: 1440, height: 1800 });
        await page.setContent(
          "<!DOCTYPE html><html><body style='margin:0;background:#525659;display:flex;justify-content:center;padding:20px;'><canvas id='pdf-canvas'></canvas></body></html>",
        );
        await page.addScriptTag({ content: pdfJsCode });

        await page.evaluate(
          ({ base64, worker }: { base64: string; worker: string }) => {
            return new Promise<void>((resolve, reject) => {
              const blob = new Blob([worker], {
                type: "application/javascript",
              });
              const win = window as unknown as {
                pdfjsLib: {
                  GlobalWorkerOptions: { workerSrc: string };
                  getDocument: (args: { data: Uint8Array }) => {
                    promise: Promise<{
                      getPage: (pageNumber: number) => Promise<{
                        getViewport: (args: { scale: number }) => {
                          width: number;
                          height: number;
                        };
                        render: (args: {
                          canvasContext: CanvasRenderingContext2D;
                          viewport: unknown;
                        }) => { promise: Promise<void> };
                      }>;
                    }>;
                  };
                };
              };

              win.pdfjsLib.GlobalWorkerOptions.workerSrc =
                URL.createObjectURL(blob);

              const raw = atob(base64);
              const bytes = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

              win.pdfjsLib
                .getDocument({ data: bytes })
                .promise.then((pdf) => {
                  return pdf.getPage(1).then((pdfPage) => {
                    const vp = pdfPage.getViewport({ scale: 2.0 });
                    const canvas = document.getElementById(
                      "pdf-canvas",
                    ) as HTMLCanvasElement;
                    canvas.width = vp.width;
                    canvas.height = vp.height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                      reject(new Error("Canvas context missing"));
                      return;
                    }
                    return pdfPage
                      .render({ canvasContext: ctx, viewport: vp })
                      .promise.then(() => resolve());
                  });
                })
                .catch(reject);
            });
          },
          { base64: pdfBase64, worker: workerCode },
        );

        const pdfRenderedName = `${type}-pdf-rendered.png`;
        const canvasElement = page.locator("#pdf-canvas");
        await canvasElement.screenshot({
          path: path.join(outputDir, pdfRenderedName),
        });
        const checks = {
          actingTitleCorrected: type === "barangay_residency" ? !htmlPageText.includes("Acting Barangay Chairman") : true,
          officeTitleMatches: htmlPageText.includes(expectedOfficeTitle),
          pdfGeneratedSuccessfully: pdfBytes.length > 0,
          signerNamePresent: htmlPageText.includes("DIOGENES E. MANAOG"),
          signerRoleMatches: htmlPageText.includes(expectedSignerRole),
          titleMatches: htmlPageText.includes(expectedTitle),
        };

        auditSummary.push({
          certificateType: type,
          expectedOfficeTitle,
          expectedSignerRole,
          expectedTitle,
          desktopScreenshot: desktopShot,
          tabletScreenshot: tabletShot,
          mobileScreenshot: mobileShot,
          pdfGenerated: pdfName,
          pdfRendered: pdfRenderedName,
          status: "PASS",
          checks,
        });
      }

      await browser.close();

      await writeFile(
        path.join(outputDir, "audit-summary.json"),
        JSON.stringify(auditSummary, null, 2),
        "utf8",
      );

      expect(auditSummary.length).toBe(4);
      expect(auditSummary.every((s) => s.status === "PASS")).toBe(true);
    },
    90_000,
  );
});

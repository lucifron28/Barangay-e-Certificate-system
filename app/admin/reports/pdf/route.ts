import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAdmin } from "@/lib/auth/guards";
import {
  filterRequests,
  listAdminRequests,
} from "@/lib/services/certificate-data";
import { certificateLabel, formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

function safeText(value: string) {
  return value.replace(/[^\x20-\x7e]/g, "");
}

export async function GET(request: Request) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const requests = filterRequests(
    await listAdminRequests(context.supabase),
    params,
  );
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([792, 612]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Barangay Bato e-Certificate System", {
    x: 36,
    y: 560,
    font: bold,
    size: 16,
  });
  page.drawText("Certificate Request Summary Report", {
    x: 36,
    y: 540,
    font,
    size: 11,
  });

  const headers = ["Request No.", "Resident", "Type", "Date", "Status", "Fee", "Payment"];
  const widths = [100, 155, 150, 90, 90, 55, 75];
  let y = 505;
  let x = 36;

  headers.forEach((header, index) => {
    page.drawText(header, { x, y, font: bold, size: 8 });
    x += widths[index] ?? 80;
  });

  y -= 16;
  for (const item of requests.slice(0, 28)) {
    x = 36;
    const row = [
      item.request_number,
      item.resident?.full_name ?? "Unknown",
      certificateLabel(item.certificate_type),
      formatDate(item.date_requested),
      item.status,
      item.fee_amount ? `PHP ${item.fee_amount}` : "Free",
      item.payment_status,
    ];

    row.forEach((cell, index) => {
      page.drawText(safeText(cell).slice(0, 28), {
        x,
        y,
        font,
        size: 7.5,
        color: rgb(0.05, 0.05, 0.05),
      });
      x += widths[index] ?? 80;
    });
    y -= 15;
  }

  page.drawText(
    "Barangay Bato e-Certificate System - thesis/demo report.",
    {
      x: 36,
      y: 36,
      font,
      size: 8,
    },
  );

  const bytes = await pdf.save();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="barangay-bato-report.pdf"',
      "Content-Type": "application/pdf",
    },
  });
}

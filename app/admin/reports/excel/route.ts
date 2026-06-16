import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  filterRequests,
  listAdminRequests,
} from "@/lib/services/certificate-data";
import { certificateLabel } from "@/lib/utils/format";

export const runtime = "nodejs";

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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Certificate Requests");

  worksheet.columns = [
    { header: "Request Number", key: "request_number", width: 18 },
    { header: "Resident Name", key: "resident_name", width: 28 },
    { header: "Certificate Type", key: "certificate_type", width: 26 },
    { header: "Purpose", key: "purpose", width: 32 },
    { header: "Date Requested", key: "date_requested", width: 22 },
    { header: "Date Accepted", key: "date_accepted", width: 22 },
    { header: "Date Released", key: "date_released", width: 22 },
    { header: "Status", key: "status", width: 18 },
    { header: "Fee", key: "fee_amount", width: 12 },
    { header: "Payment Status", key: "payment_status", width: 18 },
  ];

  for (const item of requests) {
    worksheet.addRow({
      certificate_type: certificateLabel(item.certificate_type),
      date_accepted: item.date_accepted ?? "",
      date_released: item.date_released ?? "",
      date_requested: item.date_requested,
      fee_amount: item.fee_amount,
      payment_status: item.payment_status,
      purpose: item.purpose,
      request_number: item.request_number,
      resident_name: item.resident?.full_name ?? "Unknown",
      status: item.status,
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="barangay-bato-report.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

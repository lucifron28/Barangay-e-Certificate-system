import { NextResponse } from "next/server";
import writeExcelFile from "write-excel-file/node";
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
  const rows = [
    [
      "Request Number",
      "Resident Name",
      "Certificate Type",
      "Purpose",
      "Date Requested",
      "Date Accepted",
      "Date Released",
      "Status",
      "Fee",
      "Payment Status",
    ],
    ...requests.map((item) => [
      item.request_number,
      item.resident?.full_name ?? "Unknown",
      certificateLabel(item.certificate_type),
      item.purpose,
      item.date_requested,
      item.date_accepted ?? "",
      item.date_released ?? "",
      item.status,
      item.fee_amount,
      item.payment_status,
    ]),
  ];

  const buffer = await writeExcelFile(rows, {
    columns: [
      { width: 18 },
      { width: 28 },
      { width: 26 },
      { width: 32 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 18 },
      { width: 12 },
      { width: 18 },
    ],
    sheet: "Certificate Requests",
    stickyRowsCount: 1,
  }).toBuffer();
  const body = new Uint8Array(buffer.byteLength);
  body.set(buffer);

  return new Response(body.buffer, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="barangay-bato-report.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

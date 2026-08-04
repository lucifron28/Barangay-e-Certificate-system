import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { requireAdmin } from "@/lib/auth/guards";
import { getCertificateRecordByRequestId } from "@/lib/db/sqlite/queries";
import { isSqliteProvider } from "@/lib/db/provider";
import { sha256Hex } from "@/lib/security/document-hash";
import { getAdminRequest } from "@/lib/services/certificate-data";

export const runtime = "nodejs";

type PdfRouteProps = {
  params: Promise<{ id: string }>;
};

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "");
}

export async function GET(_request: Request, { params }: PdfRouteProps) {
  const context = await requireAdmin();
  const { id } = await params;

  if (context.setupMissing) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const request = await getAdminRequest(id, context.supabase);

  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  if (!isSqliteProvider()) {
    return NextResponse.json(
      { error: "Certificate download is not configured for this deployment." },
      { status: 503 },
    );
  }

  const record = getCertificateRecordByRequestId(request.id);
  if (
    !record ||
    record.status !== "issued" ||
    !record.pdf_path ||
    !record.pdf_sha256 ||
    !existsSync(record.pdf_path)
  ) {
    return NextResponse.json({ error: "Final certificate is not available." }, { status: 404 });
  }

  const pdfBytes = readFileSync(record.pdf_path);
  if (sha256Hex(pdfBytes) !== record.pdf_sha256) {
    return NextResponse.json({ error: "Certificate integrity check failed." }, { status: 409 });
  }
  const fileName = `${safeFileName(request.request_number)}-${safeFileName(
    request.certificate_type,
  )}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/pdf",
    },
  });
}

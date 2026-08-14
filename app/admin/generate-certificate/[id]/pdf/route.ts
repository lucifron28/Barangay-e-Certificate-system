import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  createCertificateDownloadLog,
  getCertificateRecordByRequestId,
} from "@/lib/db/queries";
import { getDatabaseProvider } from "@/lib/db/provider";
import { sha256Hex } from "@/lib/security/document-hash";
import { readStoredCertificatePdf } from "@/lib/certificates/private-storage";
import { getRecordStorage } from "@/lib/certificates/certificate-storage";
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

  if (getDatabaseProvider() === "supabase") {
    return NextResponse.json(
      { error: "Certificate download is not configured for this deployment." },
      { status: 503 },
    );
  }

  const record = await getCertificateRecordByRequestId(request.id);
  if (
    !record ||
    record.status !== "issued" ||
    !record.pdf_sha256
  ) {
    if (record) await createCertificateDownloadLog(record.id, context.profile.id, "denied_not_issued");
    return NextResponse.json({ error: "Final certificate is not available." }, { status: 404 });
  }

  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await readStoredCertificatePdf(getRecordStorage(record));
  } catch {
    // Storage providers may throw for a missing or unavailable private object;
    // the route intentionally returns the same safe response in either case.
  }
  if (!pdfBytes) {
    await createCertificateDownloadLog(record.id, context.profile.id, "denied_missing_artifact");
    return NextResponse.json({ error: "Final certificate is not available." }, { status: 404 });
  }
  if (sha256Hex(pdfBytes) !== record.pdf_sha256) {
    await createCertificateDownloadLog(record.id, context.profile.id, "integrity_failure");
    return NextResponse.json({ error: "Certificate integrity check failed." }, { status: 409 });
  }
  await createCertificateDownloadLog(record.id, context.profile.id, "downloaded");
  const fileName = `${safeFileName(request.request_number)}-${safeFileName(
    request.certificate_type,
  )}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

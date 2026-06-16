import { NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/certificates/pdf-generator";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getAdminRequest,
  getSystemSettings,
} from "@/lib/services/certificate-data";

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

  const [request, settings] = await Promise.all([
    getAdminRequest(id, context.supabase),
    getSystemSettings(context.supabase),
  ]);

  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const pdfBytes = await generateCertificatePdf({
    barangayCaptainName: settings.barangayCaptainName,
    preparedBy: context.profile.full_name,
    request,
    signatureImagePath: settings.signatureImagePath,
  });
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

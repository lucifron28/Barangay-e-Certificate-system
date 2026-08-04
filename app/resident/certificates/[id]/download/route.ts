import { existsSync, readFileSync } from "node:fs";
import {
  createCertificateDownloadLog,
  getCertificateRecordById,
  getRequestById,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";
import { requireResident } from "@/lib/auth/guards";
import { logActivity } from "@/lib/actions/helpers";
import { isSqliteProvider } from "@/lib/db/provider";
import { sha256Hex } from "@/lib/security/document-hash";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireResident();
  const { id } = await params;
  if (context.setupMissing) return new Response("Unavailable", { status: 503 });
  if (!isSqliteProvider()) return new Response("Certificate delivery is not configured.", { status: 503 });

  const record = getCertificateRecordById(id);
  const expired = !record?.verification_expires_at || new Date(record.verification_expires_at).getTime() < Date.now();
  if (!record || record.resident_id !== context.profile.id || record.status !== "issued" || expired || !record.pdf_path || !record.pdf_sha256 || !existsSync(record.pdf_path)) {
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const bytes = readFileSync(record.pdf_path);
  if (sha256Hex(bytes) !== record.pdf_sha256) {
    return new Response("Certificate integrity check failed", { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  createCertificateDownloadLog(record.id, context.profile.id, "downloaded");
  const request = getRequestById(record.request_id);
  if (request?.status === "ready_for_download") {
    updateRequestStatus({ id: record.request_id, status: "done", dateReleased: new Date().toISOString() });
  }
  await logActivity({
    action: "Certificate downloaded",
    affectedRecordId: record.id,
    affectedTable: "certificate_records",
    profile: context.profile,
    remarks: `Resident downloaded ${record.certificate_number}.`,
    supabase: context.supabase,
  });

  return new Response(bytes, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${record.certificate_number}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}

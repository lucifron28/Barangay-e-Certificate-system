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
import { getCertificateDownloadDenial } from "@/lib/certificates/certificate-download";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireResident();
  const { id } = await params;
  if (context.setupMissing) return new Response("Unavailable", { status: 503 });
  if (!isSqliteProvider()) return new Response("Certificate delivery is not configured.", { status: 503 });

  const record = getCertificateRecordById(id);
  const artifactExists = Boolean(record?.pdf_path && existsSync(record.pdf_path));
  const denial = getCertificateDownloadDenial({
    artifactExists,
    record,
    residentId: context.profile.id,
  });
  if (denial) {
    if (record) createCertificateDownloadLog(record.id, context.profile.id, denial);
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (!record || !record.pdf_path || !record.pdf_sha256) {
    if (record) createCertificateDownloadLog(record.id, context.profile.id, "denied_missing_artifact");
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const bytes = readFileSync(record.pdf_path);
  const integrityDenial = getCertificateDownloadDenial({
    artifactExists,
    integrityChecked: true,
    integrityValid: sha256Hex(bytes) === record.pdf_sha256,
    record,
    residentId: context.profile.id,
  });
  if (integrityDenial) {
    createCertificateDownloadLog(record.id, context.profile.id, integrityDenial);
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
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

import {
  createCertificateDownloadLog,
  getCertificateRecordById,
  getRequestById,
  updateRequestStatus,
} from "@/lib/db/queries";
import { requireResident } from "@/lib/auth/guards";
import { logActivity } from "@/lib/actions/helpers";
import { getDatabaseProvider } from "@/lib/db/provider";
import { sha256Hex } from "@/lib/security/document-hash";
import { getCertificateDownloadDenial } from "@/lib/certificates/certificate-download";
import {
  readStoredCertificatePdf,
  storedCertificateArtifactExists,
} from "@/lib/certificates/private-storage";
import { getRecordStorage } from "@/lib/certificates/certificate-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireResident();
  const { id } = await params;
  if (context.setupMissing) return new Response("Unavailable", { status: 503 });
  if (getDatabaseProvider() === "supabase") return new Response("Certificate delivery is not configured.", { status: 503 });

  const record = await getCertificateRecordById(id);
  const storage = record ? getRecordStorage(record) : null;
  const artifactExists = storage ? storedCertificateArtifactExists(storage) : false;
  const denial = getCertificateDownloadDenial({
    artifactExists,
    record,
    residentId: context.profile.id,
  });
  if (denial) {
    if (record) await createCertificateDownloadLog(record.id, context.profile.id, denial);
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  if (!record || !record.pdf_sha256 || !storage) {
    if (record) await createCertificateDownloadLog(record.id, context.profile.id, "denied_missing_artifact");
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let bytes: Uint8Array | null = null;
  try {
    bytes = await readStoredCertificatePdf(storage);
  } catch {
    // Keep provider failures indistinguishable from a missing private object.
  }
  if (!bytes) {
    await createCertificateDownloadLog(record.id, context.profile.id, "denied_missing_artifact");
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const integrityDenial = getCertificateDownloadDenial({
    artifactExists,
    integrityChecked: true,
    integrityValid: sha256Hex(bytes) === record.pdf_sha256,
    record,
    residentId: context.profile.id,
  });
  if (integrityDenial) {
    await createCertificateDownloadLog(record.id, context.profile.id, integrityDenial);
    return new Response("Certificate unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  await createCertificateDownloadLog(record.id, context.profile.id, "downloaded");
  const request = await getRequestById(record.request_id);
  if (request?.status === "ready_for_download") {
    await updateRequestStatus({ id: record.request_id, status: "done", dateReleased: new Date().toISOString() });
  }
  await logActivity({
    action: "Certificate downloaded",
    affectedRecordId: record.id,
    affectedTable: "certificate_records",
    profile: context.profile,
    remarks: `Resident downloaded ${record.certificate_number}.`,
    supabase: context.supabase,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${record.certificate_number}.pdf"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

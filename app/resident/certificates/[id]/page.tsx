import Link from "next/link";
import { redirect } from "next/navigation";
import { requireResident } from "@/lib/auth/guards";
import { getCertificateRecordById } from "@/lib/db/sqlite/queries";
import { certificateLabel, formatDate } from "@/lib/utils/format";

export default async function ResidentCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireResident(); const { id } = await params;
  if (context.setupMissing) return null;
  const record = getCertificateRecordById(id);
  if (!record || record.resident_id !== context.profile.id) redirect("/resident/certificates");
  const expired = record.verification_expires_at ? new Date(record.verification_expires_at).getTime() < Date.now() : true;
  const available = record.status === "issued" && !expired;
  return <div className="mx-auto max-w-2xl space-y-5"><h1 className="text-3xl font-bold">{certificateLabel(record.certificate_type)}</h1><section className="rounded-lg border border-base-300 bg-base-100 p-5"><p>{record.certificate_number}</p><p>Issued: {formatDate(record.date_issued)}</p><p>Verification expires: {formatDate(record.verification_expires_at ?? "")}</p></section>{available ? <Link className="btn btn-primary" href={`/resident/certificates/${record.id}/download`}>Download certificate PDF</Link> : <div className="alert alert-warning">This certificate is no longer available for download.</div>}<p className="text-sm text-base-content/70">QR verification confirms issuance/status only and does not prevent photocopying.</p></div>;
}

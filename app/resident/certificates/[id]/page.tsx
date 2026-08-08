import Link from "next/link";
import { redirect } from "next/navigation";
import { requireResident } from "@/lib/auth/guards";
import { getCertificateRecordById } from "@/lib/db/sqlite/queries";
import { certificateLabel, formatDate } from "@/lib/utils/format";
import {
  certificateStatusBadgeClass,
  CERTIFICATE_DISPLAY_STATUS_LABELS,
  getCertificateDisplayStatus,
} from "@/lib/certificates/certificate-status";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";

export default async function ResidentCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireResident();
  const { id } = await params;
  if (context.setupMissing) return null;
  if (!isCertificateIssuanceConfigured()) {
    return <div className="alert alert-warning">{CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE}</div>;
  }
  const record = getCertificateRecordById(id);
  if (!record || record.resident_id !== context.profile.id) redirect("/resident/certificates");
  const displayStatus = getCertificateDisplayStatus(record);
  const available = displayStatus === "valid";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-bold">{certificateLabel(record.certificate_type)}</h1>
      <section className="rounded-lg border border-base-300 bg-base-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">{record.certificate_number}</p>
          <span className={`badge ${certificateStatusBadgeClass(displayStatus)}`}>
            {CERTIFICATE_DISPLAY_STATUS_LABELS[displayStatus]}
          </span>
        </div>
        <p>Issued: {formatDate(record.date_issued)}</p>
        <p>Verification expires: {formatDate(record.verification_expires_at ?? "")}</p>
        {record.replacement_record_id ? (
          <Link className="link link-primary" href={`/resident/certificates/${record.replacement_record_id}`}>
            View replacement certificate
          </Link>
        ) : null}
      </section>
      {available ? (
        <Link className="btn btn-primary" href={`/resident/certificates/${record.id}/download`}>
          Download certificate PDF
        </Link>
      ) : (
        <div className="alert alert-warning">
          {displayStatus === "replaced"
            ? "This certificate was replaced. Use the replacement link above."
            : displayStatus === "revoked"
              ? "This certificate was revoked and is no longer available for download."
              : "This certificate is no longer available for download."}
        </div>
      )}
      <p className="text-sm text-base-content/70">
        QR verification confirms issuance/status only and does not prevent photocopying.
      </p>
    </div>
  );
}

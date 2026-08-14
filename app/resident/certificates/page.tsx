import Link from "next/link";
import { requireResident } from "@/lib/auth/guards";
import { listResidentCertificateRecords } from "@/lib/db/queries";
import {
  certificateStatusBadgeClass,
  CERTIFICATE_DISPLAY_STATUS_LABELS,
  getCertificateDisplayStatus,
} from "@/lib/certificates/certificate-status";
import { certificateLabel, formatDate } from "@/lib/utils/format";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";

export default async function ResidentCertificatesPage() {
  const context = await requireResident();
  if (context.setupMissing) return null;
  if (!isCertificateIssuanceConfigured()) {
    return <div className="alert alert-warning">{CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE}</div>;
  }
  const records = await listResidentCertificateRecords(context.profile.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Certificates</h1>
        <p className="text-base-content/70">Issued certificates remain downloadable while valid.</p>
      </div>
      {records.length === 0 ? (
        <div className="alert">No issued certificates are available yet.</div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <section key={record.id} className="rounded-lg border border-base-300 bg-base-100 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{certificateLabel(record.certificate_type)}</h2>
                  <p className="text-sm text-base-content/70">
                    {record.certificate_number} - issued {formatDate(record.date_issued)}
                  </p>
                </div>
                <span className={`badge ${certificateStatusBadgeClass(getCertificateDisplayStatus(record))}`}>
                  {CERTIFICATE_DISPLAY_STATUS_LABELS[getCertificateDisplayStatus(record)]}
                </span>
                <Link className="btn btn-primary btn-sm" href={`/resident/certificates/${record.id}`}>
                  View certificate
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

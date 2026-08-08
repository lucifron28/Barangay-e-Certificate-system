import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { CertificateIssuanceEditor } from "@/components/certificates/certificate-issuance-editor";
import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { PrintButton } from "@/components/ui/print-button";
import { SetupRequired } from "@/components/ui/setup-required";
import { revokeCertificateRecordAction, saveCertificateRecordAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getAdminRequest,
  getSystemSettings,
} from "@/lib/services/certificate-data";
import { getCertificateRecordByRequestId } from "@/lib/db/sqlite/queries";
import { isSqliteProvider } from "@/lib/db/provider";
import { isCertificateIssuanceEligible } from "@/lib/services/certificate-issuance";
import { toInputDate } from "@/lib/utils/format";

type GenerateCertificatePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function GenerateCertificatePage({
  params,
  searchParams,
}: GenerateCertificatePageProps) {
  const context = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const [request, settings] = await Promise.all([
    getAdminRequest(id, context.supabase),
    getSystemSettings(context.supabase),
  ]);

  if (!request) {
    return <div className="alert alert-error">Request not found.</div>;
  }

  const certificateRecord = isSqliteProvider() ? getCertificateRecordByRequestId(request.id) : null;
  const hasActiveCertificate = certificateRecord?.status === "issued";
  const isReissue = certificateRecord?.status === "revoked";
  const eligibleForIssuance = isCertificateIssuanceEligible(request) && !hasActiveCertificate;
  const canPreview = hasActiveCertificate || eligibleForIssuance || isReissue;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/admin/certificate-requests/${id}`} className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
          <h1 className="mt-4 text-3xl font-bold">
            {certificateRecord?.status === "revoked"
              ? "Reissue Certificate"
              : "Generate Certificate"}
          </h1>
          <p className="text-base-content/70">
            Printable HTML certificate based on the provided official PDF layout
            references.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasActiveCertificate ? <PrintButton /> : null}
          {hasActiveCertificate ? (
            <Link
              href={`/admin/generate-certificate/${id}/pdf`}
              className="btn btn-outline"
            >
              <FileDown className="size-4" aria-hidden />
              Download PDF
            </Link>
          ) : null}
        </div>
      </div>

      <div className="no-print">
        <FlashMessage error={query?.error} message={query?.message} />
        <div className="alert alert-warning">
          <span>
            The downloadable PDF is generated from clean code templates; the
            source PDFs remain private reference files. The displayed signature
            is a visual thesis/demo representation only.
          </span>
        </div>
      </div>

      {canPreview ? (
        hasActiveCertificate ? (
          <PrintableCertificate
            barangayCaptainName={settings.barangayCaptainName}
            certificateNumber={certificateRecord?.certificate_number ?? undefined}
            dateIssued={certificateRecord?.date_issued}
            preparedBy={context.profile.full_name}
            request={request}
            snapshot={certificateRecord?.certificate_snapshot}
          />
        ) : (
          <CertificateIssuanceEditor
            action={saveCertificateRecordAction}
            barangayCaptainName={settings.barangayCaptainName}
            initialDateIssued={toInputDate(new Date().toISOString())}
            isReissue={isReissue}
            preparedBy={context.profile.full_name}
            request={request}
          />
        )
      ) : null}

      {certificateRecord?.status === "issued" ? (
        <form action={revokeCertificateRecordAction} className="no-print space-y-3 rounded-lg border border-error/30 bg-base-100 p-5 shadow-sm">
          <input type="hidden" name="certificate_record_id" value={certificateRecord.id} />
          <div><h2 className="font-semibold">Revoke issued certificate</h2><p className="text-sm text-base-content/70">Revocation disables the QR verification record. The original PDF is retained for the audit trail.</p></div>
          <label className="form-control max-w-xl"><span className="label"><span className="label-text">Revocation reason</span></span><textarea className="textarea textarea-bordered" name="reason" minLength={3} required /></label>
          <SubmitButton className="btn btn-error" pendingText="Revoking...">Revoke certificate</SubmitButton>
        </form>
      ) : !canPreview ? (
        <div className="no-print alert alert-warning">
          Certificate issuance is unavailable until the request is accepted and
          its fee is paid, or the request is marked free.
        </div>
      ) : null}
    </div>
  );
}

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
import { getCertificateRecordByRequestId } from "@/lib/db/queries";
import { getDatabaseProvider } from "@/lib/db/provider";
import { isCertificateIssuanceEligible } from "@/lib/services/certificate-issuance";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";
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

  const certificateRecord = getDatabaseProvider() === "supabase"
    ? null
    : await getCertificateRecordByRequestId(request.id);
  const hasActiveCertificate = certificateRecord?.status === "issued";
  const isReissue = certificateRecord?.status === "revoked";
  const eligibleForIssuance = isCertificateIssuanceEligible(request) && !hasActiveCertificate;
  const canPreview =
    isCertificateIssuanceConfigured() &&
    (hasActiveCertificate || eligibleForIssuance || isReissue);
  const signatureImageConfigured = certificateRecord
    ? Boolean(certificateRecord.certificate_snapshot?.signature_image_key)
    : Boolean(settings.signatureImagePath);
  const signatureImageUrl = signatureImageConfigured
    ? `/api/admin/signature${certificateRecord?.id ? `?record_id=${encodeURIComponent(certificateRecord.id)}` : ""}`
    : null;

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
            <a
              href={`/admin/generate-certificate/${id}/pdf`}
              className="btn btn-outline"
            >
              <FileDown className="size-4" aria-hidden />
              Download PDF
            </a>
          ) : null}
        </div>
      </div>

      <div className="no-print">
        <FlashMessage error={query?.error} message={query?.message} />
        <div className="alert alert-warning">
          <span>
            The downloadable PDF is generated from clean code templates; the
            source PDFs remain private reference files. The displayed signer is
            a visual electronic signature for thesis/demo use only, not a
            legally verified digital signature.
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
            signatureImageUrl={signatureImageUrl}
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
            signatureImageUrl={signatureImageUrl}
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
      ) : !isCertificateIssuanceConfigured() ? (
        <div className="no-print alert alert-warning">
          {CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE} Configure the selected
          database and private certificate-storage providers before enabling
          this workflow.
        </div>
      ) : !canPreview ? (
        <div className="no-print alert alert-warning">
          Certificate issuance is unavailable until the request is accepted and its
          fee is verified by staff, or the request is marked free.
        </div>
      ) : null}
    </div>
  );
}

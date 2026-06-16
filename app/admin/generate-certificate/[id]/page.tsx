import Link from "next/link";
import { ArrowLeft, FileDown, Save } from "lucide-react";
import { PrintableCertificate } from "@/components/certificates/printable-certificate";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { PrintButton } from "@/components/ui/print-button";
import { SetupRequired } from "@/components/ui/setup-required";
import { saveCertificateRecordAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getAdminRequest,
  getSystemSettings,
} from "@/lib/services/certificate-data";
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/admin/certificate-requests/${id}`} className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Generate Certificate</h1>
          <p className="text-base-content/70">
            Printable HTML certificate based on the provided official PDF layout
            references.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <Link
            href={`/admin/generate-certificate/${id}/pdf`}
            className="btn btn-outline"
          >
            <FileDown className="size-4" aria-hidden />
            Download PDF
          </Link>
        </div>
      </div>

      <div className="no-print">
        <FlashMessage error={query?.error} message={query?.message} />
        <div className="alert alert-warning">
          <span>
            Reminder: Barangay Captain signature and official stamp are physical
            steps after printing. The downloadable PDF is generated from clean
            code templates; the source PDFs remain private reference files.
          </span>
        </div>
      </div>

      <PrintableCertificate
        barangayCaptainName={settings.barangayCaptainName}
        preparedBy={context.profile.full_name}
        request={request}
        signatureImagePath={settings.signatureImagePath}
      />

      <form
        action={saveCertificateRecordAction}
        className="no-print flex flex-wrap items-end gap-3 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
      >
        <input type="hidden" name="request_id" value={request.id} />
        <label className="form-control">
          <span className="label">
            <span className="label-text">Date Issued</span>
          </span>
          <input
            className="input input-bordered"
            name="date_issued"
            type="date"
            defaultValue={toInputDate(new Date().toISOString())}
            required
          />
        </label>
        <SubmitButton pendingText="Saving...">
          <Save className="size-4" aria-hidden />
          Save Certificate Record
        </SubmitButton>
        <Link href={`/admin/certificate-requests/${id}`} className="btn btn-ghost">
          Cancel
        </Link>
      </form>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Mail, Printer, WalletCards } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  acceptRequestAction,
  rejectRequestAction,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { getSubmittedInformation, usesSitio } from "@/lib/services/submitted-data";
import { getAdminRequest } from "@/lib/services/certificate-data";
import {
  getCertificateRecordByRequestId,
  listNotificationLogsForRequest,
  listPaymentsForRequest,
} from "@/lib/db/queries";
import { getDatabaseProvider } from "@/lib/db/provider";
import { isCertificateIssuanceEligible } from "@/lib/services/certificate-issuance";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
} from "@/lib/utils/format";

type AdminRequestDetailsProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function AdminRequestDetailsPage({
  params,
  searchParams,
}: AdminRequestDetailsProps) {
  const context = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const request = await getAdminRequest(id, context.supabase);

  if (!request) {
    return (
      <div className="space-y-4">
        <Link href="/admin/certificate-requests" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <div className="alert alert-error">Request not found.</div>
      </div>
    );
  }

  const submittedInformation = getSubmittedInformation(request);
  const [certificateRecord, paymentAttempts, notificationLogs] =
    getDatabaseProvider() === "supabase"
      ? [null, [], []]
      : await Promise.all([
          getCertificateRecordByRequestId(request.id),
          listPaymentsForRequest(request.id),
          listNotificationLogsForRequest(request.id),
        ]);
  const hasActiveCertificate = certificateRecord?.status === "issued";
  const issuanceEligible = isCertificateIssuanceEligible(request) && !hasActiveCertificate;
  const reissueEligible = certificateRecord?.status === "revoked";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/certificate-requests" className="btn btn-ghost btn-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>
      <FlashMessage error={query?.error} message={query?.message} />

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-base-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{request.request_number}</h1>
            <p className="text-base-content/70">
              {certificateLabel(request.certificate_type)}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-base-content/60">Resident Name</dt>
            <dd className="font-medium">{request.resident?.full_name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Age</dt>
            <dd className="font-medium">{request.resident?.age ?? "Not set"}</dd>
          </div>
          {usesSitio(request.certificate_type) ? <div>
            <dt className="text-sm text-base-content/60">Address / Sitio</dt>
            <dd className="font-medium">{request.resident?.address_sitio ?? "Not set"}</dd>
          </div> : null}
          <div>
            <dt className="text-sm text-base-content/60">Contact Number</dt>
            <dd className="font-medium">
              {request.resident?.contact_number ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Purpose</dt>
            <dd className="font-medium">{request.purpose}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Date Requested</dt>
            <dd className="font-medium">{formatDate(request.date_requested)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Remarks</dt>
            <dd className="font-medium">{request.remarks ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Fee</dt>
            <dd className="font-medium">{formatCurrency(request.fee_amount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Payment Status</dt>
            <dd className="font-medium">
              <PaymentBadge status={request.payment_status} />
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg bg-base-200 p-4">
          <h2 className="font-semibold">Submitted Information</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {submittedInformation.map((field) => <div key={field.label}><dt className="text-sm text-base-content/60">{field.label}</dt><dd className="font-medium">{field.value}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold">
                <WalletCards className="size-4" aria-hidden />
                Payment attempts
              </h2>
              <p className="mt-1 text-sm text-base-content/70">
                Payment proof submissions and staff verification history for this request.
              </p>
            </div>
            <PaymentBadge status={request.payment_status} />
          </div>
          {paymentAttempts.length ? (
            <div className="mt-4 divide-y divide-base-300">
              {paymentAttempts.map((payment) => (
                <div key={payment.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.provider_transaction_id}</p>
                    <p className="text-xs text-base-content/60">
                      {formatCurrency(payment.amount)} · {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <span className={`badge badge-sm ${paymentAttemptBadgeClass[payment.status] ?? "badge-ghost"}`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-base-content/60">No payment attempts recorded.</p>
          )}
        </div>

        <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Mail className="size-4" aria-hidden />
              Notification history
            </h2>
            <p className="mt-1 text-sm text-base-content/70">
              Email attempts are recorded even when the optional provider is not configured.
            </p>
          </div>
          {notificationLogs.length ? (
            <div className="mt-4 divide-y divide-base-300">
              {notificationLogs.map((notification) => (
                <div key={notification.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{notification.subject}</p>
                    <p className="truncate text-xs text-base-content/60">
                      {notification.recipient_email} · {formatDate(notification.created_at)}
                    </p>
                  </div>
                  <span className={`badge badge-sm ${notificationBadgeClass[notification.status] ?? "badge-ghost"}`}>
                    {notification.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-base-content/60">No notification attempts recorded.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={acceptRequestAction}
          className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
        >
          <h2 className="font-bold">Accept request</h2>
          <input type="hidden" name="request_id" value={request.id} />
          <label className="form-control mt-3">
            <span className="label">
              <span className="label-text">Remarks</span>
            </span>
            <textarea className="textarea textarea-bordered" name="remarks" />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton
              className="btn btn-info"
              disabled={request.status !== "pending"}
              pendingText="Accepting..."
            >
              Accept Request
            </SubmitButton>
          </div>
        </form>

        <form
          action={rejectRequestAction}
          className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm"
        >
          <h2 className="font-bold">Reject request</h2>
          <input type="hidden" name="request_id" value={request.id} />
          <label className="form-control mt-3">
            <span className="label">
              <span className="label-text">Rejection Remarks</span>
            </span>
            <textarea className="textarea textarea-bordered" name="remarks" required />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton
              className="btn btn-error"
              disabled={request.status !== "pending"}
              pendingText="Rejecting..."
            >
              Reject Request
            </SubmitButton>
            {issuanceEligible || reissueEligible ? <Link href={`/admin/generate-certificate/${request.id}`} className="btn btn-primary"><Printer className="size-4" aria-hidden />{reissueEligible ? "Reissue Certificate" : "Generate Certificate"}</Link> : <span className="text-sm text-base-content/60">{hasActiveCertificate ? "Certificate already issued. Revoke it before reissuing." : request.status !== "accepted" ? "Certificate issuance requires an accepted request." : "Verify the GCash or Maya payment in Payment Verification before certificate issuance."}</span>}
          </div>
        </form>
      </section>

    </div>
  );
}

const paymentAttemptBadgeClass: Record<string, string> = {
  cancelled: "badge-ghost",
  expired: "badge-warning",
  failed: "badge-error",
  free: "badge-info",
  paid: "badge-success",
  pending: "badge-warning",
  processing: "badge-info",
  refunded: "badge-error",
};

const notificationBadgeClass: Record<string, string> = {
  failed: "badge-error",
  sent: "badge-success",
  skipped: "badge-warning",
};

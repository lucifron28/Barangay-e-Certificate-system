import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  History,
  Printer,
  XCircle,
} from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { SetupRequired } from "@/components/ui/setup-required";
import { SubmitButton } from "@/components/forms/submit-button";
import { confirmPaymentAction, rejectPaymentAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { getPaymentById } from "@/lib/db/queries";
import { certificateLabel, formatCurrency, formatDate } from "@/lib/utils/format";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  PAYMENT_REJECTION_REASONS,
  type PaymentProvider,
} from "@/types/enums";

export default async function AdminPaymentReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment) {
    notFound();
  }

  const query = await searchParams;
  const isPending = payment.status === "pending";
  const isPaid = payment.status === "paid";
  const isFailed = payment.status === "failed";

  const providerLabel =
    PAYMENT_PROVIDER_LABELS[payment.provider as PaymentProvider] ?? payment.provider;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="btn btn-circle btn-ghost btn-sm"
            aria-label="Back to payment verification queue"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Payment Verification</h1>
            <p className="text-base-content/70 text-sm">
              Review transaction proof for Request{" "}
              {payment.request?.request_number ?? payment.request_id}
            </p>
          </div>
        </div>

        <span
          className={`badge badge-lg self-start sm:self-auto ${
            isPaid
              ? "badge-success text-white"
              : isPending
                ? "badge-warning font-bold"
                : isFailed
                  ? "badge-error text-white"
                  : "badge-ghost"
          }`}
        >
          {PAYMENT_RECORD_STATUS_LABELS[payment.status] ?? payment.status}
        </span>
      </div>

      <FlashMessage error={query?.error} message={query?.message} />

      {/* Prominent Verification Notice */}
      <div className="alert alert-warning border border-warning/60 bg-warning/10 text-warning-content shadow-sm">
        <AlertTriangle className="size-5 shrink-0" aria-hidden />
        <div className="text-xs sm:text-sm">
          <h3 className="font-bold">Merchant History Cross-Check Required</h3>
          <p className="mt-0.5 text-base-content/80">
            Verify this transaction directly against the official {providerLabel} merchant
            account history before confirming. An uploaded screenshot alone is not automatic
            proof of payment.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Details & Timeline */}
        <div className="space-y-6 lg:col-span-7">
          {/* Transaction Summary Card */}
          <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <h2 className="border-b border-base-200 pb-3 font-bold text-lg">
              Transaction Details
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-base-content/60 uppercase">Payment Method</dt>
                <dd className="mt-1 font-semibold text-base">{providerLabel}</dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Reference Number</dt>
                <dd className="mt-1 font-mono font-bold text-base text-primary">
                  {payment.provider_transaction_id}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Required / Paid Amount</dt>
                <dd className="mt-1 font-bold text-lg text-success">
                  {formatCurrency(payment.amount)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Resident Date & Time</dt>
                <dd className="mt-1 font-medium">
                  {payment.transaction_datetime
                    ? new Date(payment.transaction_datetime).toLocaleString()
                    : "Not specified"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Submitted On</dt>
                <dd className="mt-1 font-medium">
                  {payment.submitted_at
                    ? new Date(payment.submitted_at).toLocaleString()
                    : formatDate(payment.created_at)}
                </dd>
              </div>

              {payment.reviewed_at && (
                <div>
                  <dt className="text-xs text-base-content/60 uppercase">Reviewed On</dt>
                  <dd className="mt-1 font-medium">
                    {new Date(payment.reviewed_at).toLocaleString()}
                  </dd>
                </div>
              )}

              {payment.reviewer && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-base-content/60 uppercase">Reviewed By</dt>
                  <dd className="mt-1 font-medium">
                    {payment.reviewer.full_name} ({payment.reviewer.role})
                  </dd>
                </div>
              )}

              {payment.review_remarks && (
                <div className="sm:col-span-2 rounded-md bg-base-200 p-3">
                  <dt className="text-xs text-base-content/60 uppercase font-semibold">
                    Review Remarks / Rejection Reason
                  </dt>
                  <dd className="mt-1 font-medium text-sm text-error">
                    {payment.review_remarks}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Request & Resident Info */}
          <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <h2 className="border-b border-base-200 pb-3 font-bold text-lg">
              Associated Certificate Request
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-base-content/60 uppercase">Request Number</dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/certificate-requests/${payment.request_id}`}
                    className="link link-primary font-mono font-semibold"
                  >
                    {payment.request?.request_number ?? payment.request_id}
                  </Link>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Certificate Type</dt>
                <dd className="mt-1 font-semibold">
                  {payment.request
                    ? certificateLabel(payment.request.certificate_type)
                    : "Certificate"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Resident Name</dt>
                <dd className="mt-1 font-semibold">
                  {payment.resident?.full_name ?? "Unknown"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-base-content/60 uppercase">Contact & Sitio</dt>
                <dd className="mt-1 text-base-content/80">
                  {payment.resident?.contact_number || "No contact"} ·{" "}
                  {payment.resident?.address_sitio || "No sitio"}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs text-base-content/60 uppercase">Purpose</dt>
                <dd className="mt-1 text-base-content/80">
                  {payment.request?.purpose ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Event History Timeline */}
          {payment.events && payment.events.length > 0 && (
            <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-base-200 pb-3">
                <History className="size-5 text-primary" aria-hidden />
                <h2 className="font-bold text-lg">Payment Event History</h2>
              </div>

              <ul className="timeline timeline-vertical timeline-compact mt-4">
                {payment.events.map((event, index) => (
                  <li key={event.id}>
                    {index > 0 && <hr />}
                    <div className="timeline-middle">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden />
                    </div>
                    <div className="timeline-end timeline-box my-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold text-xs capitalize">
                          {event.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-base-content/50">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      {typeof event.payload === "object" && event.payload !== null && (
                        <p className="mt-1 text-xs text-base-content/70">
                          {JSON.stringify(event.payload)}
                        </p>
                      )}
                    </div>
                    {index < (payment.events?.length ?? 0) - 1 && <hr />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right Column: Screenshot & Verification Actions */}
        <div className="space-y-6 lg:col-span-5">
          {/* Payment Proof Screenshot */}
          <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <h2 className="font-bold text-lg">Payment Proof Screenshot</h2>
            <p className="mt-1 text-xs text-base-content/60">
              Uploaded by resident as transaction evidence.
            </p>

            {payment.proof_storage_key ? (
              <div className="mt-4 space-y-3">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-base-300 bg-base-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/payments/proof/${payment.id}`}
                    alt="Payment Screenshot Evidence"
                    className="size-full object-contain p-1"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/api/payments/proof/${payment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Open Full Size Image
                  </a>

                  {payment.proof_sha256 && (
                    <div className="rounded bg-base-200 p-2 text-[10px] text-base-content/60">
                      <span className="font-semibold block">SHA-256 Checksum:</span>
                      <span className="font-mono break-all">{payment.proof_sha256}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-base-300 p-6 text-center text-xs text-base-content/60">
                No screenshot file attached to this record.
              </div>
            )}
          </section>

          {/* Action Box */}
          {isPending ? (
            <div className="space-y-6">
              {/* Confirm Payment Form */}
              <section className="rounded-lg border-2 border-success/40 bg-success/5 p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-5 text-success" aria-hidden />
                  <h3 className="font-bold text-lg text-success-content">
                    Confirm & Approve Payment
                  </h3>
                </div>
                <p className="mt-1 text-xs text-base-content/70">
                  Confirm only after verifying that ₱{payment.amount}.00 with reference{" "}
                  <strong>{payment.provider_transaction_id}</strong> is received in the official
                  merchant account.
                </p>

                <form action={confirmPaymentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="payment_id" value={payment.id} />

                  <div>
                    <label className="label text-xs font-semibold">
                      <span>Verification Notes (Optional)</span>
                    </label>
                    <input
                      name="remarks"
                      type="text"
                      placeholder="e.g. Verified via GCash Merchant Portal"
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <SubmitButton
                    className="btn btn-success btn-sm w-full text-white"
                    pendingText="Confirming payment..."
                  >
                    Confirm Payment Received
                  </SubmitButton>
                </form>
              </section>

              {/* Reject Payment Form */}
              <section className="rounded-lg border border-error/40 bg-error/5 p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="size-5 text-error" aria-hidden />
                  <h3 className="font-bold text-lg text-error-content">
                    Reject Payment Proof
                  </h3>
                </div>
                <p className="mt-1 text-xs text-base-content/70">
                  If the reference is invalid, amount is incorrect, or receipt is unreadable,
                  reject the proof so the resident can correct and resubmit.
                </p>

                <form action={rejectPaymentAction} className="mt-4 space-y-3">
                  <input type="hidden" name="payment_id" value={payment.id} />

                  <div>
                    <label className="label text-xs font-semibold">
                      <span>Select Rejection Reason *</span>
                    </label>
                    <select
                      name="reason"
                      className="select select-bordered select-sm w-full"
                      required
                    >
                      <option value="">-- Select reason --</option>
                      {PAYMENT_REJECTION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs font-semibold">
                      <span>Additional Instructions for Resident</span>
                    </label>
                    <textarea
                      name="remarks"
                      placeholder="e.g. Reference number does not match any transaction in today's merchant ledger."
                      className="textarea textarea-bordered textarea-sm w-full"
                      rows={2}
                    />
                  </div>

                  <SubmitButton
                    className="btn btn-error btn-sm w-full text-white"
                    pendingText="Rejecting proof..."
                  >
                    Reject Payment Proof
                  </SubmitButton>
                </form>
              </section>
            </div>
          ) : isPaid ? (
            <section className="rounded-lg border border-success/40 bg-success/5 p-6 text-center shadow-sm">
              <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
              <h3 className="mt-3 font-bold text-lg">Payment Verified</h3>
              <p className="mt-1 text-xs text-base-content/70">
                This transaction has been settled. You may now proceed with official certificate
                generation.
              </p>
              <Link
                href={`/admin/generate-certificate/${payment.request_id}`}
                className="btn btn-primary btn-sm mt-4 w-full gap-2"
              >
                <Printer className="size-4" aria-hidden />
                Generate Certificate
              </Link>
            </section>
          ) : (
            <section className="rounded-lg border border-error/40 bg-error/5 p-6 text-center shadow-sm">
              <XCircle className="mx-auto size-12 text-error" aria-hidden />
              <h3 className="mt-3 font-bold text-lg">Payment Proof Rejected</h3>
              <p className="mt-1 text-xs text-base-content/70">
                This payment was rejected. The resident has been notified to resubmit valid
                payment details.
              </p>
              <Link
                href={`/admin/certificate-requests/${payment.request_id}`}
                className="btn btn-outline btn-sm mt-4 w-full"
              >
                View Certificate Request
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Receipt,
  XCircle,
} from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { ResidentPaymentForm } from "@/components/payments/resident-payment-form";
import { getResidentPaymentData } from "@/lib/actions/payments";
import { certificateLabel, formatCurrency } from "@/lib/utils/format";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  type PaymentProvider,
  type PaymentRecordStatus,
} from "@/types/enums";

export default async function ResidentPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { latestPayment, payments, request, settings } =
    await getResidentPaymentData(id);

  if (!request) {
    redirect("/resident/my-requests?error=Payment%20request%20not%20found.");
  }

  const isPendingVerification = latestPayment?.status === "pending";
  const isPaid = request.payment_status === "paid" || latestPayment?.status === "paid";
  const isRejected = latestPayment?.status === "failed";
  const isFree = request.payment_status === "free" || request.fee_amount === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/resident/my-requests/${request.id}`}
          className="btn btn-circle btn-ghost btn-sm"
          aria-label="Back to request details"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Pay Certificate Fee</h1>
          <p className="text-base-content/70">
            Official fee payment and proof submission for Request {request.request_number}
          </p>
        </div>
      </div>

      <FlashMessage error={query?.error} message={query?.message} />

      {/* Summary Card */}
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-base-200 pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" aria-hidden />
            <h2 className="font-bold text-lg">Fee Breakdown</h2>
          </div>
          <span
            className={`badge ${
              isPaid
                ? "badge-success text-white"
                : isPendingVerification
                  ? "badge-warning"
                  : isRejected
                    ? "badge-error text-white"
                    : isFree
                      ? "badge-info text-white"
                      : "badge-ghost"
            }`}
          >
            {isPaid
              ? "Verified / Paid"
              : isPendingVerification
                ? "Pending Verification"
                : isRejected
                  ? "Proof Rejected"
                  : isFree
                    ? "Free"
                    : "Awaiting Payment"}
          </span>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-base-content/60 uppercase">Request Number</dt>
            <dd className="mt-1 font-semibold">{request.request_number}</dd>
          </div>
          <div>
            <dt className="text-xs text-base-content/60 uppercase">Certificate Type</dt>
            <dd className="mt-1 font-semibold">{certificateLabel(request.certificate_type)}</dd>
          </div>
          <div>
            <dt className="text-xs text-base-content/60 uppercase">Purpose</dt>
            <dd className="mt-1 text-base-content/80">{request.purpose}</dd>
          </div>
          <div>
            <dt className="text-xs text-base-content/60 uppercase">Amount Due</dt>
            <dd className="mt-1 font-bold text-lg text-primary">
              {formatCurrency(request.fee_amount)}
            </dd>
          </div>
        </dl>
      </section>

      {/* State-specific alerts and proof views */}
      {isFree ? (
        <div className="alert alert-info">
          <CheckCircle2 className="size-5" aria-hidden />
          <div>
            <h3 className="font-bold">No Payment Required</h3>
            <p className="text-xs">
              This certificate request is free of charge and does not require payment proof.
            </p>
          </div>
        </div>
      ) : isPaid ? (
        <div className="alert alert-success text-white">
          <CheckCircle2 className="size-5" aria-hidden />
          <div>
            <h3 className="font-bold">Payment Verified & Settled</h3>
            <p className="text-xs">
              Your payment has been manually verified by Barangay staff. Your certificate will
              be processed for issuance.
            </p>
          </div>
        </div>
      ) : isPendingVerification && latestPayment ? (
        <section className="space-y-4 rounded-lg border border-warning/40 bg-warning/5 p-6">
          <div className="flex items-start gap-3 text-warning-content">
            <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-bold text-base">Payment Proof Submitted — Pending Verification</h3>
              <p className="mt-1 text-sm text-base-content/80">
                Your payment details have been received. Authorized barangay staff will verify
                the transaction against official merchant records before approving and issuing
                your certificate.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-base-200 bg-base-100 p-4">
            <h4 className="font-semibold text-xs text-base-content/70 uppercase">
              Submitted Transaction Details
            </h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-base-content/50">Payment Method</dt>
                <dd className="font-medium">
                  {PAYMENT_PROVIDER_LABELS[latestPayment.provider as PaymentProvider] ??
                    latestPayment.provider}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-base-content/50">Reference Number</dt>
                <dd className="font-mono font-medium">{latestPayment.provider_transaction_id}</dd>
              </div>
              <div>
                <dt className="text-xs text-base-content/50">Transaction Date & Time</dt>
                <dd className="font-medium">
                  {latestPayment.transaction_datetime
                    ? new Date(latestPayment.transaction_datetime).toLocaleString()
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-base-content/50">Submitted On</dt>
                <dd className="font-medium">
                  {latestPayment.submitted_at
                    ? new Date(latestPayment.submitted_at).toLocaleString()
                    : new Date(latestPayment.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>

            {latestPayment.proof_storage_key && (
              <div className="mt-4 border-t border-base-200 pt-4">
                <span className="text-xs text-base-content/50 uppercase">Payment Proof Screenshot</span>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative aspect-video max-h-32 overflow-hidden rounded-md border border-base-300 bg-base-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/payments/proof/${latestPayment.id}`}
                      alt="Uploaded payment proof"
                      className="size-full object-cover"
                    />
                  </div>
                  <a
                    href={`/api/payments/proof/${latestPayment.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    View Full Screenshot
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : isRejected && latestPayment ? (
        <section className="space-y-4">
          <div className="alert alert-error text-white">
            <XCircle className="size-5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-bold">Payment Proof Rejected</h3>
              <p className="mt-1 text-sm font-semibold">
                Reason: {latestPayment.review_remarks || "Invalid payment details"}
              </p>
              <p className="mt-1 text-xs opacity-90">
                Please review the reason above and resubmit corrected payment details below.
              </p>
            </div>
          </div>

          {settings && (
            <ResidentPaymentForm
              latestPayment={latestPayment}
              request={request}
              settings={settings}
            />
          )}
        </section>
      ) : (
        settings && (
          <ResidentPaymentForm
            latestPayment={latestPayment}
            request={request}
            settings={settings}
          />
        )
      )}

      {/* Payment History */}
      {payments.length > 1 && (
        <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
          <h3 className="font-bold text-base">Payment Submission History</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">
                      {PAYMENT_PROVIDER_LABELS[p.provider as PaymentProvider] ?? p.provider}
                    </td>
                    <td className="font-mono text-xs">{p.provider_transaction_id}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td className="text-xs">
                      {p.submitted_at
                        ? new Date(p.submitted_at).toLocaleDateString()
                        : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          p.status === "paid"
                            ? "badge-success text-white"
                            : p.status === "pending"
                              ? "badge-warning"
                              : p.status === "failed"
                                ? "badge-error text-white"
                                : "badge-ghost"
                        }`}
                      >
                        {PAYMENT_RECORD_STATUS_LABELS[p.status as PaymentRecordStatus] ?? p.status}
                      </span>
                    </td>
                    <td className="text-xs text-base-content/70">
                      {p.review_remarks || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex justify-between">
        <Link href={`/resident/my-requests/${request.id}`} className="btn btn-ghost">
          View Request Details
        </Link>
        <Link href="/resident/my-requests" className="btn btn-ghost">
          Back to My Requests
        </Link>
      </div>
    </div>
  );
}

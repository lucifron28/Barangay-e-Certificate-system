import Link from "next/link";
import { Clock, CreditCard, Eye } from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";
import {
  countPendingPayments,
  listPaymentsForVerification,
} from "@/lib/db/queries";
import { certificateLabel, formatCurrency, formatDate } from "@/lib/utils/format";
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  type PaymentProvider,
  type PaymentRecordStatus,
} from "@/types/enums";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    status?: string;
  }>;
}) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const query = await searchParams;
  const statusFilter = (query?.status ?? "pending") as PaymentRecordStatus | "all";

  const payments = await listPaymentsForVerification(
    statusFilter === "all" ? undefined : statusFilter,
  );
  const pendingCount = await countPendingPayments();

  const tabs: Array<{ id: PaymentRecordStatus | "all"; label: string; count?: number }> = [
    { count: pendingCount, id: "pending", label: "Pending Verification" },
    { id: "paid", label: "Verified / Paid" },
    { id: "failed", label: "Rejected" },
    { id: "all", label: "All Payments" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Verification</h1>
          <p className="text-base-content/70">
            Verify submitted GCash and Maya payments against official merchant records before
            certificate issuance.
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="badge badge-warning gap-2 p-3 font-semibold">
            <Clock className="size-4" aria-hidden />
            {pendingCount} Pending Verification
          </div>
        )}
      </div>

      <FlashMessage error={query?.error} message={query?.message} />

      {/* Filter Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-1">
        {tabs.map((tab) => {
          const isActive =
            statusFilter === tab.id || (tab.id === "pending" && !query?.status);
          return (
            <Link
              key={tab.id}
              href={`/admin/payments?status=${tab.id}`}
              className={`tab gap-2 ${isActive ? "tab-active font-bold" : ""}`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="badge badge-sm badge-warning text-black">
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Verification Instructions Callout */}
      <div className="rounded-lg border border-info/40 bg-info/5 p-4 text-xs text-info-content">
        <p className="font-bold">Verification Policy:</p>
        <p className="mt-1 text-base-content/80">
          Submitting payment proof does not settle a payment. Authorized staff must cross-check
          the reference number and amount directly in the official GCash/Maya merchant app
          before confirming.
        </p>
      </div>

      {/* Payments List Table */}
      {payments.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Request</th>
                <th>Resident</th>
                <th>Certificate</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Reference Number</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const isPending = p.status === "pending";
                const isPaid = p.status === "paid";
                const isFailed = p.status === "failed";

                return (
                  <tr key={p.id} className={isPending ? "bg-warning/5" : undefined}>
                    <td>
                      <Link
                        href={`/admin/certificate-requests/${p.request_id}`}
                        className="link link-primary font-mono font-medium text-xs"
                      >
                        {p.request?.request_number ?? p.request_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td>
                      <div className="font-semibold text-sm">
                        {p.resident?.full_name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-base-content/60">
                        {p.resident?.address_sitio ?? p.resident?.contact_number ?? ""}
                      </div>
                    </td>
                    <td className="text-xs">
                      {p.request
                        ? certificateLabel(p.request.certificate_type)
                        : "Certificate"}
                    </td>
                    <td>
                      <span className="badge badge-outline badge-sm font-semibold">
                        {PAYMENT_PROVIDER_LABELS[p.provider as PaymentProvider] ?? p.provider}
                      </span>
                    </td>
                    <td className="font-bold text-sm">{formatCurrency(p.amount)}</td>
                    <td>
                      <span className="font-mono text-xs font-semibold">
                        {p.provider_transaction_id}
                      </span>
                    </td>
                    <td className="text-xs text-base-content/70">
                      {p.submitted_at
                        ? new Date(p.submitted_at).toLocaleString()
                        : formatDate(p.created_at)}
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          isPaid
                            ? "badge-success text-white"
                            : isPending
                              ? "badge-warning"
                              : isFailed
                                ? "badge-error text-white"
                                : "badge-ghost"
                        }`}
                      >
                        {PAYMENT_RECORD_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/payments/${p.id}`}
                        className={`btn btn-xs gap-1 ${
                          isPending ? "btn-primary" : "btn-outline"
                        }`}
                      >
                        <Eye className="size-3" aria-hidden />
                        {isPending ? "Review Proof" : "Details"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-100 p-12 text-center">
          <CreditCard className="mx-auto size-12 text-base-content/30" aria-hidden />
          <h3 className="mt-4 font-bold text-lg">No Payment Records Found</h3>
          <p className="mt-1 text-sm text-base-content/60">
            {statusFilter === "pending"
              ? "There are currently no payments awaiting staff verification."
              : `No payments found under status "${statusFilter}".`}
          </p>
        </div>
      )}
    </div>
  );
}

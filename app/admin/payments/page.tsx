import Link from "next/link";
import { Clock, CreditCard, Eye } from "lucide-react";
import { FlashMessage } from "@/components/ui/flash-message";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
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

function PaymentStatusBadge({ status }: { status: PaymentRecordStatus }) {
  const tone =
    status === "paid"
      ? "badge-success text-white"
      : status === "pending"
        ? "badge-warning"
        : status === "failed"
          ? "badge-error text-white"
          : "badge-ghost";

  return (
    <span className={`badge badge-sm whitespace-nowrap ${tone}`}>
      {PAYMENT_RECORD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

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

      {/* Payment records use cards below desktop so status and actions stay visible on narrow screens. */}
      {payments.length > 0 ? (
        <>
          <div className="space-y-3 lg:hidden">
            {payments.map((p) => {
              const isPending = p.status === "pending";
              const requestNumber = p.request?.request_number ?? p.request_id.slice(0, 8);
              const providerLabel =
                PAYMENT_PROVIDER_LABELS[p.provider as PaymentProvider] ?? p.provider;

              return (
                <MobileRecordCard
                  key={p.id}
                  title={
                    <Link
                      href={`/admin/certificate-requests/${p.request_id}`}
                      className="link link-primary font-mono text-xs font-semibold"
                    >
                      {requestNumber}
                    </Link>
                  }
                  description={p.resident?.full_name ?? "Unknown resident"}
                  status={<PaymentStatusBadge status={p.status} />}
                  fields={[
                    {
                      label: "Certificate",
                      value: p.request
                        ? certificateLabel(p.request.certificate_type)
                        : "Certificate",
                    },
                    {
                      label: "Method",
                      value: (
                        <span className="badge badge-outline badge-sm whitespace-nowrap font-semibold">
                          {providerLabel}
                        </span>
                      ),
                    },
                    { label: "Amount", value: formatCurrency(p.amount) },
                    {
                      label: "Submitted",
                      value: p.submitted_at
                        ? new Date(p.submitted_at).toLocaleString()
                        : formatDate(p.created_at),
                    },
                    {
                      label: "Reference Number",
                      value: (
                        <span className="break-all font-mono text-xs font-semibold">
                          {p.provider_transaction_id}
                        </span>
                      ),
                      fullWidth: true,
                    },
                  ]}
                  actions={
                    <Link
                      href={`/admin/payments/${p.id}`}
                      className={`btn btn-sm w-full gap-1 whitespace-nowrap sm:w-auto ${
                        isPending ? "btn-primary" : "btn-outline"
                      }`}
                    >
                      <Eye className="size-4" aria-hidden />
                      {isPending ? "Review Proof" : "Details"}
                    </Link>
                  }
                />
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm lg:block">
            <table className="table min-w-[1072px] table-fixed">
              <caption className="sr-only">Payment records awaiting or completed verification</caption>
              <thead>
                <tr>
                  <th className="w-28 whitespace-nowrap">Request</th>
                  <th className="w-32">Resident</th>
                  <th className="w-28">Certificate</th>
                  <th className="w-20 whitespace-nowrap">Method</th>
                  <th className="w-[4.5rem] whitespace-nowrap">Amount</th>
                  <th className="w-28 text-xs leading-tight">
                    Reference
                    <br />
                    Number
                  </th>
                  <th className="w-32 whitespace-nowrap">Submitted</th>
                  <th className="w-40 whitespace-nowrap">Status</th>
                  <th className="w-36 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isPending = p.status === "pending";
                  const requestNumber = p.request?.request_number ?? p.request_id.slice(0, 8);
                  const providerLabel =
                    PAYMENT_PROVIDER_LABELS[p.provider as PaymentProvider] ?? p.provider;

                  return (
                    <tr key={p.id} className={isPending ? "bg-warning/5" : undefined}>
                      <td className="whitespace-nowrap">
                        <Link
                          href={`/admin/certificate-requests/${p.request_id}`}
                          className="link link-primary font-mono text-xs font-medium"
                        >
                          {requestNumber}
                        </Link>
                      </td>
                      <td>
                        <div className="truncate font-semibold text-sm" title={p.resident?.full_name ?? "Unknown"}>
                          {p.resident?.full_name ?? "Unknown"}
                        </div>
                        <div className="truncate text-xs text-base-content/60">
                          {p.resident?.address_sitio ?? p.resident?.contact_number ?? ""}
                        </div>
                      </td>
                      <td className="text-xs">
                        <span className="line-clamp-2">
                          {p.request
                            ? certificateLabel(p.request.certificate_type)
                            : "Certificate"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="badge badge-outline badge-sm font-semibold">
                          {providerLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-bold text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td>
                        <span
                          className="block truncate font-mono text-xs font-semibold"
                          title={p.provider_transaction_id}
                        >
                          {p.provider_transaction_id}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-xs text-base-content/70">
                        {p.submitted_at
                          ? new Date(p.submitted_at).toLocaleString()
                          : formatDate(p.created_at)}
                      </td>
                      <td>
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td>
                        <Link
                          href={`/admin/payments/${p.id}`}
                          className={`btn btn-sm min-w-0 gap-1 whitespace-nowrap px-2 ${
                            isPending ? "btn-primary" : "btn-outline"
                          }`}
                        >
                          <Eye className="size-4" aria-hidden />
                          {isPending ? "Review Proof" : "Details"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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

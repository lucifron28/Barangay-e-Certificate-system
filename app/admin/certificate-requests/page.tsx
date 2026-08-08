import Link from "next/link";
import { CalendarPlus, Eye, FileText, Inbox, Printer } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  acceptRequestAction,
  markPaymentPaidAction,
  markRequestReadyAction,
  markRequestDoneAction,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from "@/types/enums";
import {
  filterRequests,
  listAdminRequests,
} from "@/lib/services/certificate-data";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";
import { getCertificateRecordByRequestId } from "@/lib/db/sqlite/queries";
import { isSqliteProvider } from "@/lib/db/provider";

type CertificateRequestsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminCertificateRequestsPage({
  searchParams,
}: CertificateRequestsPageProps) {
  const context = await requireAdmin();
  const params = (await searchParams) ?? {};

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const requests = filterRequests(
    await listAdminRequests(context.supabase),
    params,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Requests</h1>
        <p className="text-base-content/70">
          {isFullyOnlineDemo
            ? "Review submissions, confirm demo payment, and issue secure certificates."
            : "Review resident submissions and move requests through the office workflow."}
        </p>
      </div>
      <FlashMessage error={params.error} message={params.message} />

      <form className="grid gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Certificate type</span>
          <select className="select select-bordered select-sm" name="certificate_type" defaultValue={readParam(params, "certificate_type")}>
          <option value="">All certificate types</option>
          {CERTIFICATE_TYPES.map((type) => (
            <option key={type} value={type}>
              {CERTIFICATE_TYPE_LABELS[type]}
            </option>
          ))}
          </select>
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Status</span>
          <select className="select select-bordered select-sm" name="status" defaultValue={readParam(params, "status")}>
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {REQUEST_STATUS_LABELS[status]}
            </option>
          ))}
          </select>
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Resident name</span>
          <input
          className="input input-bordered input-sm"
          name="resident_name"
          placeholder="Resident name"
          defaultValue={readParam(params, "resident_name")}
          />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Date requested</span>
          <input
          className="input input-bordered input-sm"
          name="date_requested"
          type="date"
          defaultValue={readParam(params, "date_requested")}
          />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Month</span>
          <input
          className="input input-bordered input-sm"
          name="month"
          placeholder="Month 1-12"
          defaultValue={readParam(params, "month")}
          />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Year</span>
          <input
          className="input input-bordered input-sm"
          name="year"
          placeholder="Year"
          defaultValue={readParam(params, "year")}
          />
        </label>
        <button className="btn btn-primary btn-sm md:col-span-3 xl:col-span-1" type="submit">
          Filter
        </button>
      </form>

      {requests.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {requests.map((request) => {
                const schedule = request.pickup_schedules[0];
              const certificateRecord = isSqliteProvider()
                ? getCertificateRecordByRequestId(request.id)
                : null;
              const showIssue =
                (request.status === "accepted" &&
                  ["paid", "free"].includes(request.payment_status) &&
                  certificateRecord?.status !== "issued") ||
                certificateRecord?.status === "revoked";
              return (
                <MobileRecordCard
                  key={request.id}
                  title={request.request_number}
                  description={certificateLabel(request.certificate_type)}
                  status={<StatusBadge status={request.status} />}
                  fields={[
                    { label: "Resident", value: request.resident?.full_name ?? "Unknown" },
                    { label: "Requested", value: formatDate(request.date_requested) },
                    { label: "Purpose", value: request.purpose, fullWidth: true },
                    ...(!isFullyOnlineDemo ? [{
                      label: "Pickup schedule",
                      value: schedule
                        ? `${formatDate(schedule.pickup_date)} ${formatTime(schedule.pickup_time)}`
                        : "Not scheduled",
                    }] : []),
                    { label: "Fee", value: formatCurrency(request.fee_amount) },
                    {
                      label: "Payment",
                      value: <PaymentBadge status={request.payment_status} />,
                    },
                  ]}
                  actions={
                    <>
                      <Link href={`/admin/certificate-requests/${request.id}`} className="btn btn-ghost btn-sm">
                        <Eye className="size-4" aria-hidden />
                        View
                      </Link>
                      {request.status === "pending" ? (
                        <form action={acceptRequestAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="btn btn-info btn-sm" type="submit">Accept</button>
                        </form>
                      ) : null}
                      {!isFullyOnlineDemo && request.status === "accepted" ? (
                        <Link href={`/admin/pickup-schedules?request_id=${request.id}`} className="btn btn-secondary btn-sm">
                          <CalendarPlus className="size-4" aria-hidden />
                          Schedule
                        </Link>
                      ) : null}
                      {!isFullyOnlineDemo && request.status === "accepted" && schedule ? (
                        <form action={markRequestReadyAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="btn btn-accent btn-sm" type="submit">Ready</button>
                        </form>
                      ) : null}
                      {showIssue ? (
                        <Link href={`/admin/generate-certificate/${request.id}`} className="btn btn-primary btn-sm">
                          <Printer className="size-4" aria-hidden />
                          {certificateRecord?.status === "revoked" ? "Reissue" : "Generate"}
                        </Link>
                      ) : null}
                      {!isFullyOnlineDemo && request.payment_status === "unpaid" ? (
                        <form action={markPaymentPaidAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="btn btn-warning btn-sm" type="submit">Paid</button>
                        </form>
                      ) : null}
                      {!isFullyOnlineDemo && request.status === "ready_for_pickup" ? (
                        <form action={markRequestDoneAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="btn btn-success btn-sm" type="submit">Done</button>
                        </form>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm md:block">
          <table className="table">
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Resident Name</th>
                <th>Certificate Type</th>
                <th>Purpose</th>
                <th>Date Requested</th>
                <th>Status</th>
                {!isFullyOnlineDemo ? <th>Pickup Schedule</th> : null}
                <th>Fee</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const schedule = request.pickup_schedules[0];
                const certificateRecord = isSqliteProvider()
                  ? getCertificateRecordByRequestId(request.id)
                  : null;
                const showIssue =
                  (request.status === "accepted" &&
                    ["paid", "free"].includes(request.payment_status) &&
                    certificateRecord?.status !== "issued") ||
                  certificateRecord?.status === "revoked";
                return (
                  <tr key={request.id}>
                    <td>{request.request_number}</td>
                    <td>{request.resident?.full_name ?? "Unknown"}</td>
                    <td>{certificateLabel(request.certificate_type)}</td>
                    <td className="max-w-xs truncate">{request.purpose}</td>
                    <td>{formatDate(request.date_requested)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    {!isFullyOnlineDemo ? <td>
                      {schedule
                        ? `${formatDate(schedule.pickup_date)} ${formatTime(
                            schedule.pickup_time,
                          )}`
                        : "Not scheduled"}
                    </td> : null}
                    <td>{formatCurrency(request.fee_amount)}</td>
                    <td>
                      <PaymentBadge status={request.payment_status} />
                    </td>
                    <td>
                      <div className="flex min-w-72 flex-wrap gap-2">
                        <Link
                          href={`/admin/certificate-requests/${request.id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          <Eye className="size-3.5" aria-hidden />
                          View
                        </Link>
                        {request.status === "pending" ? (
                          <form action={acceptRequestAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <button className="btn btn-info btn-xs" type="submit">
                              Accept
                            </button>
                          </form>
                        ) : null}
                        {!isFullyOnlineDemo && request.status === "accepted" ? (
                          <Link
                            href={`/admin/pickup-schedules?request_id=${request.id}`}
                            className="btn btn-secondary btn-xs"
                          >
                            <CalendarPlus className="size-3.5" aria-hidden />
                            Schedule
                          </Link>
                        ) : null}
                        {!isFullyOnlineDemo && request.status === "accepted" && schedule ? (
                          <form action={markRequestReadyAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <button className="btn btn-accent btn-xs" type="submit">
                              Ready
                            </button>
                          </form>
                        ) : null}
                        {showIssue ? (
                          <Link
                            href={`/admin/generate-certificate/${request.id}`}
                            className="btn btn-primary btn-xs"
                          >
                            <Printer className="size-3.5" aria-hidden />
                            {certificateRecord?.status === "revoked" ? "Reissue" : "Generate"}
                          </Link>
                        ) : null}
                        {!isFullyOnlineDemo && request.payment_status === "unpaid" ? (
                          <form action={markPaymentPaidAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <button className="btn btn-warning btn-xs" type="submit">
                              Paid
                            </button>
                          </form>
                        ) : null}
                        {!isFullyOnlineDemo && request.status === "ready_for_pickup" ? (
                          <form action={markRequestDoneAction}>
                            <input type="hidden" name="request_id" value={request.id} />
                            <button className="btn btn-success btn-xs" type="submit">
                              Done
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No matching requests"
          description="Adjust filters or wait for residents to submit certificate requests."
        />
      )}

      <div className="alert alert-info">
        <FileText className="size-5" aria-hidden />
        <span>
          Rejections require remarks and are available from each request details
          page.
        </span>
      </div>
    </div>
  );
}

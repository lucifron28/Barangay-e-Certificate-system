import Link from "next/link";
import { BarChart3, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { PrintButton } from "@/components/ui/print-button";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth/guards";
import {
  filterRequests,
  listAdminRequests,
} from "@/lib/services/certificate-data";
import { summarizeRequests } from "@/lib/utils/dashboard";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES,
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from "@/types/enums";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const context = await requireAdmin();
  const params = (await searchParams) ?? {};

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const requests = filterRequests(
    await listAdminRequests(context.supabase),
    params,
  );
  const showPickupWorkflow = !isFullyOnlineDemo;

  const { stats, mostRequested } = summarizeRequests(requests);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-base-content/70">
            Printable request summary with PDF and Excel export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <Link href={`/admin/reports/pdf?${new URLSearchParams(params as Record<string, string>).toString()}`} className="btn btn-outline">
            <FileDown className="size-4" aria-hidden />
            Download PDF
          </Link>
          <Link href={`/admin/reports/excel?${new URLSearchParams(params as Record<string, string>).toString()}`} className="btn btn-outline">
            <FileSpreadsheet className="size-4" aria-hidden />
            Export Excel
          </Link>
        </div>
      </div>

      <form className="no-print grid gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm md:grid-cols-4 xl:grid-cols-7">
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
          <span className="label-text text-xs font-medium">Date from</span>
          <input className="input input-bordered input-sm" name="date_from" type="date" defaultValue={readParam(params, "date_from")} />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Date to</span>
          <input className="input input-bordered input-sm" name="date_to" type="date" defaultValue={readParam(params, "date_to")} />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Month</span>
          <input className="input input-bordered input-sm" name="month" placeholder="Month" defaultValue={readParam(params, "month")} />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Year</span>
          <input className="input input-bordered input-sm" name="year" placeholder="Year" defaultValue={readParam(params, "year")} />
        </label>
        <button className="btn btn-primary btn-sm md:col-span-4 xl:col-span-1" type="submit">
          Generate Report
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <StatCard icon={BarChart3} label="Total" value={stats.total} />
        <StatCard icon={FileText} label="Pending" tone="warning" value={stats.pending} />
        <StatCard icon={FileText} label="Accepted" tone="info" value={stats.accepted} />
        <StatCard icon={FileText} label="Rejected" tone="error" value={stats.rejected} />
        <StatCard icon={FileText} label="Done" tone="success" value={stats.done} />
        <StatCard icon={FileText} label="Cancelled" value={stats.cancelled} />
        <StatCard
          icon={FileText}
          label="Most Requested"
          tone="primary"
          value={mostRequested ? certificateLabel(mostRequested) : "None"}
        />
      </div>

      <div className="alert alert-info no-print">
        <span>
          PDF and Excel exports use a clean thesis/demo report format.
        </span>
      </div>

      {requests.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {requests.map((request) => {
              const schedule = request.pickup_schedules[0];
              return (
                <MobileRecordCard
                  key={request.id}
                  title={request.request_number}
                  description={request.resident?.full_name ?? "Unknown resident"}
                  status={<StatusBadge status={request.status} />}
                  fields={[
                    { label: "Certificate", value: certificateLabel(request.certificate_type) },
                    { label: "Requested", value: formatDate(request.date_requested) },
                    { label: "Purpose", value: request.purpose, fullWidth: true },
                    { label: "Accepted", value: formatDate(request.date_accepted) },
                    { label: "Released", value: formatDate(request.date_released) },
                    ...(showPickupWorkflow
                      ? [{
                          label: "Pickup schedule",
                          value: schedule
                            ? `${formatDate(schedule.pickup_date)} ${formatTime(schedule.pickup_time)}`
                            : "Not scheduled",
                          fullWidth: true,
                        }]
                      : []),
                    { label: "Fee", value: formatCurrency(request.fee_amount) },
                    { label: "Payment", value: <PaymentBadge status={request.payment_status} /> },
                  ]}
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
                <th>Date Accepted</th>
                {showPickupWorkflow ? <th>Pickup Schedule</th> : null}
                <th>Date Released</th>
                <th>Status</th>
                <th>Fee</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const schedule = request.pickup_schedules[0];
                return (
                  <tr key={request.id}>
                    <td>{request.request_number}</td>
                    <td>{request.resident?.full_name ?? "Unknown"}</td>
                    <td>{certificateLabel(request.certificate_type)}</td>
                    <td className="max-w-xs truncate">{request.purpose}</td>
                    <td>{formatDate(request.date_requested)}</td>
                    <td>{formatDate(request.date_accepted)}</td>
                    {showPickupWorkflow ? (
                      <td>
                        {schedule
                          ? `${formatDate(schedule.pickup_date)} ${formatTime(
                              schedule.pickup_time,
                            )}`
                          : "Not scheduled"}
                      </td>
                    ) : null}
                    <td>{formatDate(request.date_released)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>{formatCurrency(request.fee_amount)}</td>
                    <td>
                      <PaymentBadge status={request.payment_status} />
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
          icon={BarChart3}
          title="No report data"
          description="Adjust filters to include more requests."
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, Save } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  markRequestDoneAction,
  setPickupScheduleAction,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import {
  listPickupSchedules,
  listSchedulableRequests,
} from "@/lib/services/certificate-data";
import { OFFICE_HOURS_LABEL } from "@/lib/services/business-rules";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";
import { certificateLabel, formatDate, formatTime } from "@/lib/utils/format";

type PickupSchedulesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PickupSchedulesPage({
  searchParams,
}: PickupSchedulesPageProps) {
  const context = await requireAdmin();

  if (isFullyOnlineDemo) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold">Online certificate delivery</h1>
        <p className="text-base-content/70">
          Pickup scheduling is disabled in fully online demo mode. Residents
          download issued certificates from My Certificates.
        </p>
      </div>
    );
  }
  const params = (await searchParams) ?? {};

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const [schedulableRequests, schedules] = await Promise.all([
    listSchedulableRequests(context.supabase),
    listPickupSchedules(context.supabase),
  ]);
  const selectedRequestId =
    readParam(params, "request_id") || schedulableRequests[0]?.id || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pickup Schedules</h1>
        <p className="text-base-content/70">
          Office hours: {OFFICE_HOURS_LABEL}.
        </p>
      </div>
      <FlashMessage error={params.error} message={params.message} />

      <form
        action={setPickupScheduleAction}
        className="grid gap-4 rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm lg:grid-cols-4"
      >
        <label className="form-control lg:col-span-2">
          <span className="label">
            <span className="label-text">Accepted Request</span>
          </span>
          <select
            className="select select-bordered"
            name="request_id"
            defaultValue={selectedRequestId}
            required
          >
            {schedulableRequests.map((request) => (
              <option key={request.id} value={request.id}>
                {request.request_number} - {request.resident?.full_name ?? "Unknown"}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Pickup Date</span>
          </span>
          <input className="input input-bordered" name="pickup_date" type="date" required />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Pickup Time</span>
          </span>
          <input className="input input-bordered" name="pickup_time" type="time" required />
        </label>
        <label className="form-control lg:col-span-4">
          <span className="label">
            <span className="label-text">Remarks</span>
          </span>
          <textarea className="textarea textarea-bordered" name="remarks" />
        </label>
        <div className="lg:col-span-4">
          <SubmitButton pendingText="Saving schedule...">
            <Save className="size-4" aria-hidden />
            Save Schedule
          </SubmitButton>
        </div>
      </form>

      <div className="alert alert-info">
        <span>
          Admin manually assigns pickup schedules within official office hours.
          Requests are marked Done only after actual claiming.
        </span>
      </div>

      {schedules.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {schedules.map((schedule) => (
              <MobileRecordCard
                key={schedule.id}
                title={schedule.request?.request_number ?? "Unknown request"}
                description={
                  schedule.request
                    ? certificateLabel(schedule.request.certificate_type)
                    : "Certificate request"
                }
                status={
                  schedule.request ? <StatusBadge status={schedule.request.status} /> : undefined
                }
                fields={[
                  { label: "Resident", value: schedule.request?.resident?.full_name ?? "Unknown" },
                  { label: "Pickup date", value: formatDate(schedule.pickup_date) },
                  { label: "Pickup time", value: formatTime(schedule.pickup_time) },
                  { label: "Remarks", value: schedule.remarks ?? "None", fullWidth: true },
                ]}
                actions={
                  <>
                    {schedule.request ? (
                      <Link href={`/admin/certificate-requests/${schedule.request.id}`} className="btn btn-ghost btn-sm">
                        View request
                      </Link>
                    ) : null}
                    {schedule.request?.status === "ready_for_pickup" ? (
                      <form action={markRequestDoneAction}>
                        <input type="hidden" name="request_id" value={schedule.request.id} />
                        <button className="btn btn-success btn-sm" type="submit">Mark done</button>
                      </form>
                    ) : null}
                  </>
                }
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm md:block">
          <table className="table">
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Resident Name</th>
                <th>Certificate Type</th>
                <th>Status</th>
                <th>Pickup Date</th>
                <th>Pickup Time</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.request?.request_number ?? "Unknown"}</td>
                  <td>{schedule.request?.resident?.full_name ?? "Unknown"}</td>
                  <td>
                    {schedule.request
                      ? certificateLabel(schedule.request.certificate_type)
                      : "Unknown"}
                  </td>
                  <td>
                    {schedule.request ? (
                      <StatusBadge status={schedule.request.status} />
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td>{formatDate(schedule.pickup_date)}</td>
                  <td>{formatTime(schedule.pickup_time)}</td>
                  <td className="max-w-xs truncate">{schedule.remarks ?? "None"}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {schedule.request ? (
                        <Link
                          href={`/admin/certificate-requests/${schedule.request.id}`}
                          className="btn btn-ghost btn-xs"
                        >
                          View
                        </Link>
                      ) : null}
                      {schedule.request?.status === "ready_for_pickup" ? (
                        <form action={markRequestDoneAction}>
                          <input
                            type="hidden"
                            name="request_id"
                            value={schedule.request.id}
                          />
                          <button className="btn btn-success btn-xs" type="submit">
                            Mark Done
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No pickup schedules"
          description="Set schedules for accepted requests so residents know when to claim certificates."
        />
      )}
    </div>
  );
}

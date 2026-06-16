import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireResident } from "@/lib/auth/guards";
import {
  listPickupSchedules,
} from "@/lib/services/certificate-data";
import { OFFICE_HOURS_LABEL } from "@/lib/services/business-rules";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";

export default async function ResidentPickupSchedulePage() {
  const context = await requireResident();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const schedules = (await listPickupSchedules(context.supabase)).filter(
    (schedule) => schedule.request?.resident_id === context.profile.id,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pickup Schedule</h1>
        <p className="text-base-content/70">
          Office hours: {OFFICE_HOURS_LABEL}.
        </p>
      </div>
      {schedules.length ? (
        <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Certificate Type</th>
                <th>Status</th>
                <th>Pickup Date</th>
                <th>Pickup Time</th>
                <th>Office Hours</th>
                <th>Fee</th>
                <th>Payment</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.request?.request_number ?? "Unknown"}</td>
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
                  <td>{OFFICE_HOURS_LABEL}</td>
                  <td>
                    {schedule.request
                      ? formatCurrency(schedule.request.fee_amount)
                      : "Unknown"}
                  </td>
                  <td>
                    {schedule.request ? (
                      <PaymentBadge status={schedule.request.payment_status} />
                    ) : (
                      "Unknown"
                    )}
                  </td>
                  <td>{schedule.remarks ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No pickup schedules yet"
          description="Accepted requests will show pickup schedule details after the barangay office assigns them."
        />
      )}
    </div>
  );
}

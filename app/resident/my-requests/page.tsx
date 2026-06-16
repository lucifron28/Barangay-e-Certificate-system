import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentBadge } from "@/components/ui/payment-badge";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import { cancelCertificateRequestAction } from "@/lib/actions/requests";
import { requireResident } from "@/lib/auth/guards";
import { listResidentRequests } from "@/lib/services/certificate-data";
import {
  certificateLabel,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/utils/format";

export default async function MyRequestsPage() {
  const context = await requireResident();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const requests = await listResidentRequests(context.profile.id, context.supabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-base-content/70">
            You can view request details, but status changes are handled by the
            Barangay Secretary/Admin.
          </p>
        </div>
        <Link href="/resident/request-certificate" className="btn btn-primary">
          New Request
        </Link>
      </div>

      {requests.length ? (
        <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Certificate Type</th>
                <th>Purpose</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Pickup Schedule</th>
                <th>Fee</th>
                <th>Payment</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const schedule = request.pickup_schedules[0];
                return (
                  <tr key={request.id}>
                    <td>
                      <Link
                        href={`/resident/my-requests/${request.id}`}
                        className="link link-primary font-medium"
                      >
                        {request.request_number}
                      </Link>
                    </td>
                    <td>{certificateLabel(request.certificate_type)}</td>
                    <td className="max-w-xs truncate">{request.purpose}</td>
                    <td>{formatDate(request.date_requested)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>
                      {schedule
                        ? `${formatDate(schedule.pickup_date)} ${formatTime(
                            schedule.pickup_time,
                          )}`
                        : "Not scheduled"}
                    </td>
                    <td>{formatCurrency(request.fee_amount)}</td>
                    <td>
                      <PaymentBadge status={request.payment_status} />
                    </td>
                    <td className="max-w-xs truncate">{request.remarks ?? "None"}</td>
                    <td>
                      {request.status === "pending" ? (
                        <form action={cancelCertificateRequestAction}>
                          <input type="hidden" name="request_id" value={request.id} />
                          <button className="btn btn-error btn-xs" type="submit">
                            Cancel
                          </button>
                        </form>
                      ) : request.status === "rejected" ? (
                        <Link
                          href={`/resident/my-requests/${request.id}`}
                          className="btn btn-warning btn-xs"
                        >
                          Edit & Resubmit
                        </Link>
                      ) : (
                        <span className="text-xs text-base-content/60">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No certificate requests"
          description="Your submitted certificate requests will appear here."
        />
      )}
    </div>
  );
}

import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  ListChecks,
  ThumbsUp,
  XCircle,
  Ban,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireResident } from "@/lib/auth/guards";
import { listResidentRequests } from "@/lib/services/certificate-data";
import { summarizeRequests } from "@/lib/utils/dashboard";
import { certificateLabel, formatDate } from "@/lib/utils/format";

export default async function ResidentDashboardPage() {
  const context = await requireResident();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const requests = await listResidentRequests(context.profile.id, context.supabase);
  const { stats } = summarizeRequests(requests);
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {context.profile.full_name}</h1>
          <p className="mt-1 text-base-content/70">
            Track your certificate requests and pickup schedules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/resident/request-certificate" className="btn btn-primary">
            <FileText className="size-4" aria-hidden />
            New Request
          </Link>
          <Link href="/resident/my-requests" className="btn btn-outline">
            <ListChecks className="size-4" aria-hidden />
            My Requests
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard icon={Inbox} label="Total Requests" value={stats.total} />
        <StatCard icon={Clock3} label="Pending" tone="warning" value={stats.pending} />
        <StatCard icon={ThumbsUp} label="Accepted" tone="info" value={stats.accepted} />
        <StatCard icon={XCircle} label="Rejected" tone="error" value={stats.rejected} />
        <StatCard
          icon={FileText}
          label="Ready"
          tone="primary"
          value={stats.ready_for_pickup}
        />
        <StatCard icon={CheckCircle2} label="Done" tone="success" value={stats.done} />
        <StatCard icon={Ban} label="Cancelled" value={stats.cancelled} />
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 p-5">
          <h2 className="text-lg font-bold">Recent requests</h2>
        </div>
        {recentRequests.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Request Number</th>
                  <th>Certificate Type</th>
                  <th>Purpose</th>
                  <th>Date Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
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
                    <td className="max-w-sm truncate">{request.purpose}</td>
                    <td>{formatDate(request.date_requested)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Inbox}
              title="No requests yet"
              description="Submit your first barangay certificate request to start tracking it here."
            />
          </div>
        )}
      </section>
    </div>
  );
}

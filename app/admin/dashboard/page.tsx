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
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth/guards";
import { getAdminDashboard } from "@/lib/services/certificate-data";
import { certificateLabel, formatDate } from "@/lib/utils/format";
import { getCertificateDeliveryCopy } from "@/lib/services/issuance-mode";

export default async function AdminDashboardPage() {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const { stats, recentRequests, monthlyCount } =
    await getAdminDashboard(context.supabase);
  const copy = getCertificateDeliveryCopy();

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {context.profile.full_name}</h1>
          <p className="mt-1 text-base-content/70">
            Review requests, issue certificates, and monitor system activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/certificate-requests" className="btn btn-primary">
            <ListChecks className="size-4" aria-hidden />
            Review Requests
          </Link>
          <Link href="/admin/reports" className="btn btn-outline">
            Reports
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <StatCard icon={Inbox} label="Total Requests" value={stats.total} />
        <StatCard icon={Clock3} label="Pending" tone="warning" value={stats.pending} />
        <StatCard icon={ThumbsUp} label="Accepted" tone="info" value={stats.accepted} />
        <StatCard icon={XCircle} label="Rejected" tone="error" value={stats.rejected} />
        <StatCard
          icon={FileText}
          label="Ready for Download"
          tone="primary"
          value={stats.ready_for_download}
        />
        <StatCard icon={CheckCircle2} label="Done" tone="success" value={stats.done} />
        <StatCard icon={Ban} label="Cancelled" value={stats.cancelled} />
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold">Monthly statistics overview</h2>
        <p className="mt-1 text-base-content/70">
          {monthlyCount} request{monthlyCount === 1 ? "" : "s"} submitted this
          month. {copy.issuedDescription}
        </p>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 p-5">
          <h2 className="text-lg font-bold">Recent requests</h2>
        </div>
        {recentRequests.length ? (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {recentRequests.map((request) => (
                <MobileRecordCard
                  key={request.id}
                  title={
                    <Link href={`/admin/certificate-requests/${request.id}`} className="link link-primary">
                      {request.request_number}
                    </Link>
                  }
                  description={request.resident?.full_name ?? "Unknown resident"}
                  status={<StatusBadge status={request.status} />}
                  fields={[
                    { label: "Certificate", value: certificateLabel(request.certificate_type) },
                    { label: "Requested", value: formatDate(request.date_requested) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Request Number</th>
                  <th>Resident</th>
                  <th>Certificate Type</th>
                  <th>Date Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link
                        href={`/admin/certificate-requests/${request.id}`}
                        className="link link-primary font-medium"
                      >
                        {request.request_number}
                      </Link>
                    </td>
                    <td>{request.resident?.full_name ?? "Unknown resident"}</td>
                    <td>{certificateLabel(request.certificate_type)}</td>
                    <td>{formatDate(request.date_requested)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Inbox}
              title="No requests yet"
              description="Submitted resident requests will appear here for review."
            />
          </div>
        )}
      </section>
    </div>
  );
}

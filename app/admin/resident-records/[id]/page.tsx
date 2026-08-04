import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth/guards";
import { getResidentRecord } from "@/lib/services/certificate-data";
import { certificateLabel, formatDate } from "@/lib/utils/format";

type ResidentDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ResidentDetailsPage({
  params,
}: ResidentDetailsPageProps) {
  const context = await requireAdmin();
  const { id } = await params;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const { profile: resident, requests } = await getResidentRecord(
    id,
    context.supabase,
  );

  if (!resident) {
    return <div className="alert alert-error">Resident not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/resident-records" className="btn btn-ghost btn-sm">
        <ArrowLeft className="size-4" aria-hidden />
        Back
      </Link>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <h1 className="text-3xl font-bold">{resident.full_name}</h1>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-base-content/60">Email</dt>
            <dd className="font-medium">{resident.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Username</dt>
            <dd className="font-medium">{resident.username ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Address / Sitio</dt>
            <dd className="font-medium">{resident.address_sitio ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Contact Number</dt>
            <dd className="font-medium">{resident.contact_number ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Gender</dt>
            <dd className="font-medium">{resident.gender ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Occupation</dt>
            <dd className="font-medium">{resident.occupation ?? "Not set"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 p-5">
          <h2 className="text-lg font-bold">Request History</h2>
        </div>
        {requests.length ? (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {requests.map((request) => (
                <MobileRecordCard
                  key={request.id}
                  title={
                    <Link href={`/admin/certificate-requests/${request.id}`} className="link link-primary">
                      {request.request_number}
                    </Link>
                  }
                  description={certificateLabel(request.certificate_type)}
                  status={<StatusBadge status={request.status} />}
                  fields={[
                    { label: "Purpose", value: request.purpose, fullWidth: true },
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
                  <th>Certificate Type</th>
                  <th>Purpose</th>
                  <th>Date Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link
                        href={`/admin/certificate-requests/${request.id}`}
                        className="link link-primary"
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
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={Inbox}
              title="No request history"
              description="This resident has no certificate requests yet."
            />
          </div>
        )}
      </section>
    </div>
  );
}

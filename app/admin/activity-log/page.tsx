import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";
import { listActivityLogs } from "@/lib/services/certificate-data";
import { formatDateTime } from "@/lib/utils/format";

export default async function ActivityLogPage() {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const logs = (await listActivityLogs(context.supabase)).slice(0, 200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-base-content/70">
          Admin-only log of major actions performed in the system.
        </p>
      </div>

      {logs.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <MobileRecordCard
                key={log.id}
                title={log.action}
                description={formatDateTime(log.created_at)}
                fields={[
                  { label: "User", value: log.user?.full_name ?? "System" },
                  { label: "Role", value: log.role },
                  {
                    label: "Affected record",
                    value: `${log.affected_table ?? "N/A"} ${log.affected_record_id?.slice(0, 8) ?? ""}`,
                    fullWidth: true,
                  },
                  { label: "Remarks", value: log.remarks ?? "None", fullWidth: true },
                ]}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm md:block">
          <table className="table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action Performed</th>
                <th>Affected Record</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.created_at)}</td>
                  <td>{log.user?.full_name ?? "System"}</td>
                  <td>{log.role}</td>
                  <td>{log.action}</td>
                  <td className="font-mono text-xs">
                    {log.affected_table ?? "N/A"}{" "}
                    {log.affected_record_id ? log.affected_record_id.slice(0, 8) : ""}
                  </td>
                  <td className="max-w-sm truncate">{log.remarks ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Request submissions and admin actions will appear here."
        />
      )}
    </div>
  );
}

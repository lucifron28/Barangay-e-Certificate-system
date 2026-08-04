import Link from "next/link";
import { Eye, Search, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileRecordCard } from "@/components/ui/mobile-record-card";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";
import { listResidents } from "@/lib/services/certificate-data";
import { formatDate } from "@/lib/utils/format";

type ResidentRecordsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ResidentRecordsPage({
  searchParams,
}: ResidentRecordsPageProps) {
  const context = await requireAdmin();
  const params = (await searchParams) ?? {};

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const residents = (await listResidents(context.supabase)).filter((resident) => {
    const name = readParam(params, "resident_name").toLowerCase();
    const sitio = readParam(params, "sitio").toLowerCase();
    const registered = readParam(params, "date_registered");

    return (
      (!name || resident.full_name.toLowerCase().includes(name)) &&
      (!sitio || resident.address_sitio?.toLowerCase().includes(sitio)) &&
      (!registered || resident.created_at.slice(0, 10) === registered)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resident Records</h1>
        <p className="text-base-content/70">
          View registered resident profiles and request history.
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-base-300 bg-base-100 p-4 shadow-sm md:grid-cols-4">
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
          <span className="label-text text-xs font-medium">Sitio</span>
          <input
          className="input input-bordered input-sm"
          name="sitio"
          placeholder="Sitio"
          defaultValue={readParam(params, "sitio")}
          />
        </label>
        <label className="form-control gap-1">
          <span className="label-text text-xs font-medium">Date registered</span>
          <input
          className="input input-bordered input-sm"
          name="date_registered"
          type="date"
          defaultValue={readParam(params, "date_registered")}
          />
        </label>
        <button className="btn btn-primary btn-sm" type="submit">
          <Search className="size-4" aria-hidden />
          Filter
        </button>
      </form>

      {residents.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {residents.map((resident) => (
              <MobileRecordCard
                key={resident.id}
                title={resident.full_name}
                description={`Resident ID: ${resident.id.slice(0, 8)}`}
                fields={[
                  { label: "Age", value: resident.age ?? "Not set" },
                  { label: "Registered", value: formatDate(resident.created_at) },
                  { label: "Address / Sitio", value: resident.address_sitio ?? "Not set", fullWidth: true },
                  { label: "Contact", value: resident.contact_number ?? "Not set" },
                  { label: "Gender", value: resident.gender ?? "Not set" },
                  { label: "Occupation", value: resident.occupation ?? "Not set", fullWidth: true },
                ]}
                actions={
                  <Link href={`/admin/resident-records/${resident.id}`} className="btn btn-ghost btn-sm">
                    <Eye className="size-4" aria-hidden />
                    View record
                  </Link>
                }
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-base-300 bg-base-100 shadow-sm md:block">
          <table className="table">
            <thead>
              <tr>
                <th>Resident ID</th>
                <th>Full Name</th>
                <th>Age</th>
                <th>Address / Sitio</th>
                <th>Contact Number</th>
                <th>Gender</th>
                <th>Occupation</th>
                <th>Date Registered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {residents.map((resident) => (
                <tr key={resident.id}>
                  <td className="font-mono text-xs">{resident.id.slice(0, 8)}</td>
                  <td>{resident.full_name}</td>
                  <td>{resident.age ?? "Not set"}</td>
                  <td>{resident.address_sitio ?? "Not set"}</td>
                  <td>{resident.contact_number ?? "Not set"}</td>
                  <td>{resident.gender ?? "Not set"}</td>
                  <td>{resident.occupation ?? "Not set"}</td>
                  <td>{formatDate(resident.created_at)}</td>
                  <td>
                    <Link
                      href={`/admin/resident-records/${resident.id}`}
                      className="btn btn-ghost btn-xs"
                    >
                      <Eye className="size-3.5" aria-hidden />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="No resident records"
          description="Registered resident profiles will appear here."
        />
      )}
    </div>
  );
}

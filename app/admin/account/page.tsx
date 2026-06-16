import { ShieldCheck } from "lucide-react";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminAccountPage() {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
      <ShieldCheck className="mb-4 size-10 text-primary" aria-hidden />
      <h1 className="text-3xl font-bold">Admin Account</h1>
      <dl className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <dt className="text-sm text-base-content/60">Full Name</dt>
          <dd className="font-medium">{context.profile.full_name}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Email</dt>
          <dd className="font-medium">{context.profile.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Username</dt>
          <dd className="font-medium">{context.profile.username ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-sm text-base-content/60">Role</dt>
          <dd className="badge badge-primary">{context.profile.role}</dd>
        </div>
      </dl>
    </div>
  );
}

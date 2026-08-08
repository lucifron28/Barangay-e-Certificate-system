import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireResident } from "@/lib/auth/guards";
import { getResidentNavItems } from "@/lib/navigation";
import { issuanceMode } from "@/lib/services/issuance-mode";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireResident();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  return (
    <DashboardShell
      navItems={getResidentNavItems(issuanceMode)}
      profile={context.profile}
      title="Resident Portal"
    >
      {children}
    </DashboardShell>
  );
}

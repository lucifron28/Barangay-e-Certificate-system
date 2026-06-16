import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";
import { adminNavItems } from "@/lib/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  return (
    <DashboardShell
      navItems={adminNavItems}
      profile={context.profile}
      title="Admin Portal"
    >
      {children}
    </DashboardShell>
  );
}

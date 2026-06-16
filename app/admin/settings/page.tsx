import { Settings } from "lucide-react";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireAdmin } from "@/lib/auth/guards";
import { OFFICE_HOURS_LABEL } from "@/lib/services/business-rules";
import { getSystemSettings } from "@/lib/services/certificate-data";

export default async function AdminSettingsPage() {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const settings = await getSystemSettings(context.supabase);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-base-content/70">
          Demo-ready operational settings used by certificate generation and
          pickup scheduling.
        </p>
      </div>

      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <Settings className="mb-4 size-10 text-primary" aria-hidden />
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-base-content/60">Barangay Captain</dt>
            <dd className="font-medium">{settings.barangayCaptainName}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Signature Image Path</dt>
            <dd className="font-medium">
              {settings.signatureImagePath ?? "Not configured"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Pickup Office Hours</dt>
            <dd className="font-medium">{OFFICE_HOURS_LABEL}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Payment Recording</dt>
            <dd className="font-medium">
              Placeholder payment status: unpaid, paid, or free.
            </dd>
          </div>
        </dl>
        <div className="alert alert-info mt-6">
          <span>
            TODO: Add editable admin settings after final client confirmation for
            Barangay Captain name, signature image, fee recording, and production
            asset storage.
          </span>
        </div>
      </section>
    </div>
  );
}

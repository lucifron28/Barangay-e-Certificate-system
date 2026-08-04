import { Settings } from "lucide-react";
import { SetupRequired } from "@/components/ui/setup-required";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { updateSystemSettingsAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { OFFICE_HOURS_LABEL } from "@/lib/services/business-rules";
import { getSystemSettings } from "@/lib/services/certificate-data";

export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<{ error?: string; message?: string }> }) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const settings = await getSystemSettings(context.supabase);
  const query = await searchParams;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-base-content/70">
          Demo-ready operational settings used by certificate generation and
          pickup scheduling.
        </p>
      </div>

      <FlashMessage error={query?.error} message={query?.message} />
      <form action={updateSystemSettingsAction} className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <Settings className="mb-4 size-10 text-primary" aria-hidden />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-base-content/60">Barangay Captain</dt>
            <input className="input input-bordered w-full" name="barangay_captain_name" defaultValue={settings.barangayCaptainName} required />
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Signature Image Path</dt>
            <input className="input input-bordered w-full" name="signature_image_path" defaultValue={settings.signatureImagePath ?? ""} placeholder="Optional approved signature image URL" />
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Pickup Office Hours</dt>
            <dd className="font-medium">{OFFICE_HOURS_LABEL}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Payment Recording</dt>
            <dd className="font-medium">Online demo: unpaid, paid, or free.</dd>
          </div>
        </div>
        <p className="mt-5 text-sm text-base-content/70">The displayed signature remains a visual thesis/demo representation, not a cryptographic signature.</p>
        <SubmitButton className="btn btn-primary mt-5" pendingText="Saving settings...">Save settings</SubmitButton>
      </form>
    </div>
  );
}

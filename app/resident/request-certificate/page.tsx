import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { SetupRequired } from "@/components/ui/setup-required";
import { createCertificateRequestAction } from "@/lib/actions/requests";
import { requireResident } from "@/lib/auth/guards";
import { CERTIFICATE_TYPE_LABELS, CERTIFICATE_TYPES } from "@/types/enums";

type RequestCertificatePageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function RequestCertificatePage({
  searchParams,
}: RequestCertificatePageProps) {
  const context = await requireResident();
  const params = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/resident/dashboard" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Request Certificate</h1>
        <p className="mt-1 text-base-content/70">
          Submitted requests are reviewed by the Barangay Secretary before
          scheduling and printing.
        </p>
      </div>

      <FlashMessage error={params?.error} message={params?.message} />

      <form
        action={createCertificateRequestAction}
        className="grid gap-5 rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm md:grid-cols-2"
      >
        <label className="form-control md:col-span-2">
          <span className="label">
            <span className="label-text">Certificate Type</span>
          </span>
          <select className="select select-bordered" name="certificate_type" required>
            {CERTIFICATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {CERTIFICATE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label">
            <span className="label-text">Full Name</span>
          </span>
          <input
            className="input input-bordered"
            name="full_name"
            required
            defaultValue={context.profile.full_name}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Age</span>
          </span>
          <input
            className="input input-bordered"
            name="age"
            min="1"
            type="number"
            required
            defaultValue={context.profile.age ?? ""}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Sitio</span>
          </span>
          <input
            className="input input-bordered"
            name="sitio"
            required
            defaultValue={context.profile.address_sitio ?? ""}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Contact Number</span>
          </span>
          <input
            className="input input-bordered"
            name="contact_number"
            required
            defaultValue={context.profile.contact_number ?? ""}
          />
        </label>
        <label className="form-control md:col-span-2">
          <span className="label">
            <span className="label-text">Purpose</span>
          </span>
          <textarea className="textarea textarea-bordered min-h-28" name="purpose" required />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Date Requested</span>
          </span>
          <input
            className="input input-bordered"
            name="date_requested"
            type="date"
            defaultValue={today}
          />
        </label>
        <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-4 md:col-span-2">
          <p className="font-semibold">Certificate-specific fields</p>
          <p className="mt-1 text-sm text-base-content/70">
            Barangay Certificate uses place of birth. Barangay Residency uses
            birthdate and years of residency.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="label">
                <span className="label-text">Place of Birth</span>
              </span>
              <input className="input input-bordered" name="place_of_birth" />
            </label>
            <label className="form-control">
              <span className="label">
                <span className="label-text">Birthdate</span>
              </span>
              <input
                className="input input-bordered"
                name="birthdate"
                type="date"
                defaultValue={context.profile.date_of_birth ?? ""}
              />
            </label>
            <label className="form-control">
              <span className="label">
                <span className="label-text">Years of Residency</span>
              </span>
              <input
                className="input input-bordered"
                min="0"
                name="years_of_residency"
                type="number"
              />
            </label>
          </div>
        </div>
        <div className="alert alert-info md:col-span-2">
          <span>
            Certificate fees are settled during pickup. Barangay Captain
            signature and official stamp are applied physically after printing.
          </span>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <SubmitButton pendingText="Submitting...">
            <Send className="size-4" aria-hidden />
            Submit Request
          </SubmitButton>
          <Link href="/resident/dashboard" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

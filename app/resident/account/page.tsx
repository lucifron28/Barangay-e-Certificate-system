import { Save } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { SetupRequired } from "@/components/ui/setup-required";
import { updateResidentProfileAction } from "@/lib/actions/profile";
import { requireResident } from "@/lib/auth/guards";
import { toInputDate } from "@/lib/utils/format";

type AccountPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function ResidentAccountPage({
  searchParams,
}: AccountPageProps) {
  const context = await requireResident();
  const params = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-base-content/70">
          Keep your resident details updated for certificate requests.
        </p>
      </div>
      <FlashMessage error={params?.error} message={params?.message} />
      <form
        action={updateResidentProfileAction}
        className="grid gap-4 rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm md:grid-cols-2"
      >
        <label className="form-control md:col-span-2">
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
            <span className="label-text">Email Address</span>
          </span>
          <input
            className="input input-bordered"
            value={context.profile.email}
            readOnly
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Username</span>
          </span>
          <input
            className="input input-bordered"
            name="username"
            defaultValue={context.profile.username ?? ""}
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
            defaultValue={context.profile.age ?? ""}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Date of Birth</span>
          </span>
          <input
            className="input input-bordered"
            name="date_of_birth"
            type="date"
            defaultValue={toInputDate(context.profile.date_of_birth)}
          />
        </label>
        <label className="form-control md:col-span-2">
          <span className="label">
            <span className="label-text">Address / Sitio</span>
          </span>
          <input
            className="input input-bordered"
            name="address_sitio"
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
        <label className="form-control">
          <span className="label">
            <span className="label-text">Civil Status</span>
          </span>
          <input
            className="input input-bordered"
            name="civil_status"
            defaultValue={context.profile.civil_status ?? ""}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Gender</span>
          </span>
          <input
            className="input input-bordered"
            name="gender"
            defaultValue={context.profile.gender ?? ""}
          />
        </label>
        <label className="form-control">
          <span className="label">
            <span className="label-text">Occupation</span>
          </span>
          <input
            className="input input-bordered"
            name="occupation"
            defaultValue={context.profile.occupation ?? ""}
          />
        </label>
        <div className="md:col-span-2">
          <SubmitButton pendingText="Saving...">
            <Save className="size-4" aria-hidden />
            Save Profile
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

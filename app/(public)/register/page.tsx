import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { registerResidentAction } from "@/lib/actions/auth";

type RegisterPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <main className="px-6 py-10">
      <section className="mx-auto max-w-4xl rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <FlashMessage error={params?.error} message={params?.message} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Resident Registration</h1>
          <p className="mt-2 text-sm text-base-content/70">
            Create a resident account for certificate request tracking.
          </p>
        </div>
        <form action={registerResidentAction} className="grid gap-4 md:grid-cols-2">
          <label className="form-control md:col-span-2">
            <span className="label">
              <span className="label-text">Full Name</span>
            </span>
            <input className="input input-bordered" name="full_name" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Age</span>
            </span>
            <input className="input input-bordered" name="age" min="1" type="number" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Date of Birth</span>
            </span>
            <input className="input input-bordered" name="date_of_birth" type="date" />
          </label>
          <label className="form-control md:col-span-2">
            <span className="label">
              <span className="label-text">Address / Sitio</span>
            </span>
            <input className="input input-bordered" name="address_sitio" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Civil Status</span>
            </span>
            <input className="input input-bordered" name="civil_status" />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Contact Number</span>
            </span>
            <input className="input input-bordered" name="contact_number" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Gender</span>
            </span>
            <select className="select select-bordered" name="gender" defaultValue="">
              <option value="">Select gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Prefer not to say</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Occupation</span>
            </span>
            <input className="input input-bordered" name="occupation" />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Email Address</span>
            </span>
            <input className="input input-bordered" name="email" type="email" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Username</span>
            </span>
            <input className="input input-bordered" name="username" />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Password</span>
            </span>
            <PasswordInput name="password" required />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Confirm Password</span>
            </span>
            <PasswordInput
              name="confirm_password"
              required
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3 md:col-span-2">
            <SubmitButton pendingText="Registering...">
              <UserPlus className="size-4" aria-hidden />
              Register
            </SubmitButton>
            <Link href="/login" className="btn btn-outline">
              Back to Login
            </Link>
            <Link href="/" className="btn btn-ghost">
              <ArrowLeft className="size-4" aria-hidden />
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

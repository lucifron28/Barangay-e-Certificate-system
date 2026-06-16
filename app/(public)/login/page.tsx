import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import { loginAction } from "@/lib/actions/auth";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <FlashMessage error={params?.error} message={params?.message} />
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="mt-2 text-sm text-base-content/70">
            Use your email and password. Username login is supported when the
            server service key is configured.
          </p>
        </div>
        <form action={loginAction} className="space-y-4">
          <label className="form-control">
            <span className="label">
              <span className="label-text">Email or Username</span>
            </span>
            <input
              className="input input-bordered"
              name="login"
              type="text"
              placeholder="juan@example.com"
              required
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text">Password</span>
            </span>
            <input
              className="input input-bordered"
              name="password"
              type="password"
              required
            />
          </label>
          <SubmitButton className="btn btn-primary w-full" pendingText="Logging in...">
            <LogIn className="size-4" aria-hidden />
            Login
          </SubmitButton>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/" className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-4" aria-hidden />
            Back to Home
          </Link>
          <Link href="/register" className="btn btn-link btn-sm">
            Create resident account
          </Link>
        </div>
      </section>
    </main>
  );
}

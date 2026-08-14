import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ClipboardCheck,
  FileText,
  LogIn,
  PenLine,
  UserPlus,
} from "lucide-react";
import { getCertificateDeliveryCopy } from "@/lib/services/issuance-mode";

const certificateTypes = [
  "Barangay Clearance",
  "Barangay Certificate",
  "Barangay Indigency",
  "Barangay Residency",
];

export default function HomePage() {
  const copy = getCertificateDeliveryCopy();
  return (
    <main>
      <section className="grid min-h-[calc(100vh-4rem)] items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_0.9fr] lg:px-12 xl:px-20">
        <div className="max-w-3xl">
          <div className="badge badge-primary badge-outline mb-5">
            Barangay Bato, Mauban, Quezon
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Barangay Bato e-Certificate System
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-base-content/75">
            A responsive web system for residents to request barangay
            certificates online and for the Barangay Secretary to review,
            issue, and monitor requests.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">
              <LogIn className="size-4" aria-hidden />
              Login
            </Link>
            <Link href="/register" className="btn btn-outline">
              <UserPlus className="size-4" aria-hidden />
              Register
            </Link>
            <Link href="/resident/request-certificate" className="btn btn-accent">
              <FileText className="size-4" aria-hidden />
              Request Certificate
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="alert border-base-300 bg-base-100">
              <ClipboardCheck className="size-5" aria-hidden />
              <span>Requests are subject to review by the Barangay Secretary.</span>
            </div>
            <div className="alert border-base-300 bg-base-100">
              <Banknote className="size-5" aria-hidden />
              <span>Certificate fees are shown before checkout. The thesis/demo payment flow transfers no actual funds.</span>
            </div>
            <div className="alert border-base-300 bg-base-100">
              <PenLine className="size-5" aria-hidden />
              <span>
                Electronic signature display is a visual placeholder only, not a
                legally verified digital signature.
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60">Printable preview</p>
                <h2 className="text-xl font-bold">Certificate Request</h2>
              </div>
              <div className="badge badge-info">REQ-2026-0001</div>
            </div>
            <div className="rounded-lg border border-base-300 bg-base-200 p-6">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border-4 border-primary text-primary">
                <BadgeCheck className="size-8" aria-hidden />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-1/2 rounded bg-base-content/20" />
                <div className="h-4 w-full rounded bg-base-content/15" />
                <div className="h-4 w-5/6 rounded bg-base-content/15" />
                <div className="h-4 w-2/3 rounded bg-base-content/15" />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded border border-dashed border-base-content/30 p-3 text-center text-xs">
                  Prepared By
                </div>
                <div className="rounded border border-dashed border-base-content/30 p-3 text-center text-xs">
                  Signature Placeholder
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-base-100 px-6 py-14 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Covered certificates</h2>
              <p className="mt-2 text-base-content/70">
                {copy.requestDescription}
              </p>
            </div>
            <Link href="/about" className="btn btn-ghost">
              About the system
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {certificateTypes.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-base-300 bg-base-200 p-5"
              >
                <FileText className="mb-4 size-7 text-primary" aria-hidden />
                <h3 className="font-semibold">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft, QrCode, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  certificateStatusAlertClass,
  certificateStatusBadgeClass,
  CERTIFICATE_DISPLAY_STATUS_LABELS,
  certificateStatusMessage,
} from "@/lib/certificates/certificate-status";
import { certificateLabel, formatDate, formatDateTime } from "@/lib/utils/format";
import type { CertificateVerificationDto } from "@/types/database";

export function maskName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 2)}***`)
    .join(" ");
}

export type VerificationResultData = CertificateVerificationDto;
export function VerificationState({
  message,
  status = "NOT FOUND",
  tone = "error",
}: {
  message?: string;
  status?: "NOT FOUND" | "NOT AVAILABLE" | "TOO MANY REQUESTS";
  tone?: "error" | "warning";
}) {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <div className="badge badge-primary badge-outline mb-2">
          Barangay Bato, Mauban, Quezon
        </div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-sm text-base-content/70">
          Official document verification record
        </p>
      </div>

      <div className={`alert ${tone === "warning" ? "alert-warning" : "alert-error"} shadow-sm`}>
        <ShieldAlert className="size-6 shrink-0" aria-hidden />
        <div>
          <h2 className="font-bold">{status}</h2>
          <p className="text-sm">
            {message ??
              "No valid certificate record was found matching the supplied verification input."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/verify" className="btn btn-outline btn-sm gap-2">
          <ArrowLeft className="size-4" aria-hidden />
          Verify Another Certificate
        </Link>
      </div>
    </main>
  );
}

export function CertificateVerificationResultView({
  verification,
}: {
  verification: VerificationResultData;
}) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <div className="badge badge-primary badge-outline mb-2">
          Barangay Bato, Mauban, Quezon
        </div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-sm text-base-content/70">
          Official document verification record
        </p>
      </div>

      <div
        className={`alert ${certificateStatusAlertClass(verification.status)} flex items-start justify-between gap-4 shadow-sm`}
      >
        <div className="flex gap-3">
          {verification.status === "valid" ? (
            <ShieldCheck className="mt-0.5 size-6 shrink-0" aria-hidden />
          ) : (
            <ShieldAlert className="mt-0.5 size-6 shrink-0" aria-hidden />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Verification Result
            </p>
            <p className="text-base font-bold">
              {certificateStatusMessage(verification.status)}
            </p>
          </div>
        </div>
        <span
          className={`badge badge-lg shrink-0 font-semibold ${certificateStatusBadgeClass(verification.status)}`}
        >
          {CERTIFICATE_DISPLAY_STATUS_LABELS[verification.status]}
        </span>
      </div>

      <section className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-base-content/60">
          Document Details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-base-content/60">Certificate Type</dt>
            <dd className="mt-1 font-semibold text-base-content">
              {certificateLabel(verification.certificateType)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Certificate Number</dt>
            <dd className="mt-1 font-mono font-semibold text-base-content">
              {verification.certificateNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Resident (Masked)</dt>
            <dd className="mt-1 font-semibold text-base-content">
              {maskName(verification.fullName)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Issue Date</dt>
            <dd className="mt-1 text-base-content">
              {formatDate(verification.dateIssued)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Verification Expires</dt>
            <dd className="mt-1 text-base-content">
              {formatDateTime(verification.expiresAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Verification Code</dt>
            <dd className="mt-1 font-mono font-semibold text-base-content">
              {verification.shortCode}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">PDF Fingerprint</dt>
            <dd className="mt-1 font-mono text-xs text-base-content/80">
              {verification.pdfSha256?.slice(0, 12) ?? "Unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-base-content/60">Checked At</dt>
            <dd className="mt-1 text-xs text-base-content/80">
              {formatDateTime(new Date().toISOString())}
            </dd>
          </div>
        </dl>
      </section>

      <div className="rounded-xl border border-base-300 bg-base-200/60 p-5 text-sm text-base-content/75 space-y-2">
        {verification.status === "replaced" ? (
          <p className="font-semibold text-warning">
            The QR link is no longer current. A replacement certificate has been issued.
          </p>
        ) : null}
        {verification.status === "revoked" ? (
          <p className="font-semibold text-error">
            Do not rely on this certificate for a new transaction. Contact Barangay Bato office for clarification.
          </p>
        ) : null}
        <p>
          QR verification confirms issuance and status against the official Barangay Bato database.
          It does not prevent photocopying or prove that a printed copy is the only original.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/verify" className="btn btn-outline gap-2">
          <QrCode className="size-4" aria-hidden />
          Verify Another Certificate
        </Link>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import {
  certificateStatusAlertClass,
  certificateStatusBadgeClass,
  CERTIFICATE_DISPLAY_STATUS_LABELS,
  certificateStatusMessage,
} from "@/lib/certificates/certificate-status";
import { getDatabaseProvider } from "@/lib/db/provider";
import { getCertificateVerificationByToken } from "@/lib/db/queries";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { certificateLabel, formatDate, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 2)}***`)
    .join(" ");
}

function VerificationState({
  message,
  tone = "error",
  status,
}: {
  message?: string;
  status?: "NOT FOUND" | "NOT AVAILABLE" | "TOO MANY REQUESTS";
  tone?: "error" | "warning";
}) {
  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-base-content/70">Barangay Bato, Mauban, Quezon</p>
      </div>
      <div className={`alert ${tone === "warning" ? "alert-warning" : "alert-error"}`}>
        <span>{status ?? "NOT FOUND"}</span>
      </div>
      {message ? <p className="text-sm text-base-content/70">{message}</p> : null}
    </main>
  );
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const limit = await consumeRateLimit("verification", "public-verification");

  if (!limit.allowed) {
    return (
      <VerificationState
        message="Too many verification attempts. Please try again shortly."
        status="TOO MANY REQUESTS"
        tone="warning"
      />
    );
  }

  if (getDatabaseProvider() === "supabase") {
    return (
      <VerificationState
        message="Public certificate verification is not configured for this deployment yet. Configure the selected database and verification service before enabling this route."
        status="NOT AVAILABLE"
        tone="warning"
      />
    );
  }

  let verification: Awaited<ReturnType<typeof getCertificateVerificationByToken>>;
  try {
    verification = await getCertificateVerificationByToken(token);
  } catch {
    return <VerificationState />;
  }

  if (!verification) {
    return <VerificationState />;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-base-content/70">Barangay Bato, Mauban, Quezon</p>
      </div>
      <div className={`alert ${certificateStatusAlertClass(verification.status)}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Verification result</p>
          <p className="font-semibold">{certificateStatusMessage(verification.status)}</p>
        </div>
        <span className={`badge badge-lg ${certificateStatusBadgeClass(verification.status)}`}>
          {CERTIFICATE_DISPLAY_STATUS_LABELS[verification.status]}
        </span>
      </div>
      <section className="rounded-lg border border-base-300 bg-base-100 p-5">
        <dl className="grid gap-3">
          <div>
            <dt className="text-sm text-base-content/60">Certificate type</dt>
            <dd>{certificateLabel(verification.certificateType)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Certificate number</dt>
            <dd>{verification.certificateNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Resident</dt>
            <dd>{maskName(verification.fullName)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Issue date</dt>
            <dd>{formatDate(verification.dateIssued)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Verification expires</dt>
            <dd>{formatDateTime(verification.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Verification code</dt>
            <dd>{verification.shortCode}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">PDF fingerprint</dt>
            <dd>{verification.pdfSha256?.slice(0, 12) ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt className="text-sm text-base-content/60">Checked at</dt>
            <dd>{formatDateTime(new Date().toISOString())}</dd>
          </div>
        </dl>
      </section>
      <div className="rounded-lg border border-base-300 bg-base-100 p-5 text-sm text-base-content/70">
        {verification.status === "replaced" ? (
          <p className="mb-3 font-semibold text-base-content">
            The QR link is no longer current. Ask the certificate holder or Barangay Bato office for the latest verification link.
          </p>
        ) : null}
        {verification.status === "revoked" ? (
          <p className="mb-3 font-semibold text-base-content">
            Do not rely on this certificate for a new transaction. Contact the Barangay Bato office if clarification is needed.
          </p>
        ) : null}
        QR verification confirms issuance and status only. It does not prevent
        photocopying or prove that a printed copy is the only original.
      </div>
    </main>
  );
}

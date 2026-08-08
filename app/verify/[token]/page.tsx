import type { Metadata } from "next";
import { getCertificateVerificationByToken } from "@/lib/db/sqlite/queries";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { certificateLabel, formatDate, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

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
  status?: "NOT FOUND" | "TOO MANY REQUESTS";
  tone?: "error" | "warning";
}) {
  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-base-content/70">Barangay Bato, Mauban, Quezon</p>
      </div>
      <div className={`alert alert-${tone}`}>
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

  let verification: ReturnType<typeof getCertificateVerificationByToken>;
  try {
    verification = getCertificateVerificationByToken(token);
  } catch {
    return <VerificationState />;
  }

  if (!verification) {
    return <VerificationState />;
  }

  const tone =
    verification.status === "valid"
      ? "success"
      : verification.status === "expired"
        ? "warning"
        : "error";

  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <div>
        <h1 className="text-3xl font-bold">Certificate Verification</h1>
        <p className="text-base-content/70">Barangay Bato, Mauban, Quezon</p>
      </div>
      <div className={`alert alert-${tone}`}>
        <span>{verification.status.toUpperCase()}</span>
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
      <p className="text-sm text-base-content/70">
        {verification.status === "replaced"
          ? "This certificate has been replaced. Use the latest certificate issued by Barangay Bato. "
          : null}
        QR verification confirms issuance and status only. It does not prevent
        photocopying or prove that a printed copy is the only original.
      </p>
    </main>
  );
}

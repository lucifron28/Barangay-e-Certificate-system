import type { Metadata } from "next";
import { getCertificateVerificationByToken } from "@/lib/db/sqlite/queries";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { certificateLabel, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function maskName(value: string) {
  return value.split(/\s+/).map((part) => `${part.slice(0, 2)}***`).join(" ");
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limit = await consumeRateLimit("verification", token);
  if (!limit.allowed) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <div className="alert alert-warning">Too many verification attempts. Please try again shortly.</div>
      </main>
    );
  }
  const verification = getCertificateVerificationByToken(token);
  if (!verification) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <div className="alert alert-error">Verification record not found.</div>
      </main>
    );
  }
  const tone = verification.status === "valid" ? "success" : verification.status === "expired" ? "warning" : "error";
  return <main className="mx-auto max-w-xl space-y-5 p-6"><div><h1 className="text-3xl font-bold">Certificate Verification</h1><p className="text-base-content/70">Barangay Bato, Mauban, Quezon</p></div><div className={`alert alert-${tone}`}><span>{verification.status.toUpperCase()}</span></div><section className="rounded-lg border border-base-300 bg-base-100 p-5"><dl className="grid gap-3"><div><dt className="text-sm text-base-content/60">Certificate</dt><dd>{certificateLabel(verification.certificateType)}</dd></div><div><dt className="text-sm text-base-content/60">Certificate number</dt><dd>{verification.certificateNumber}</dd></div><div><dt className="text-sm text-base-content/60">Resident</dt><dd>{maskName(verification.fullName)}</dd></div><div><dt className="text-sm text-base-content/60">Issued</dt><dd>{formatDate(verification.dateIssued)}</dd></div><div><dt className="text-sm text-base-content/60">Verification expires</dt><dd>{formatDate(verification.expiresAt)}</dd></div><div><dt className="text-sm text-base-content/60">Verification code</dt><dd>{verification.shortCode}</dd></div><div><dt className="text-sm text-base-content/60">PDF fingerprint</dt><dd>{verification.pdfSha256?.slice(0, 12) ?? "Unavailable"}</dd></div></dl></section><p className="text-sm text-base-content/70">QR verification confirms that this certificate record was issued by the Barangay Bato thesis/demo system. It does not prove that a printed paper is the only original copy and does not prevent photocopying.</p></main>;
}

import type { Metadata } from "next";
import { getDatabaseProvider } from "@/lib/db/provider";
import { getCertificateVerificationByShortCode } from "@/lib/db/queries";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { normalizeShortVerificationCode } from "@/lib/certificates/verification-input";
import type { CertificateVerificationDto } from "@/types/database";
import {
  CertificateVerificationResultView,
  VerificationState,
} from "@/components/certificates/certificate-verification-view";
import { VerificationCenter } from "@/components/verification/verification-center";

export const metadata: Metadata = {
  description:
    "Verify official e-Certificates issued by Barangay Bato, Mauban, Quezon via QR code camera scan, image upload, or short verification code.",
  title: "Verify Certificate | Barangay Bato e-Certificate System",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type VerifyPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function PublicVerifyPage({ searchParams }: VerifyPageProps) {
  const { code } = await searchParams;

  // If a short code query parameter is provided, perform direct server-side verification
  if (code && typeof code === "string") {
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
          message="Public certificate verification is not configured for this deployment yet."
          status="NOT AVAILABLE"
          tone="warning"
        />
      );
    }

    const normalizedCode = normalizeShortVerificationCode(code);
    if (!normalizedCode) {
      return (
        <VerificationState
          message="The verification code format is invalid. Codes must follow the BB-XXXXXXXX format."
          status="NOT FOUND"
          tone="error"
        />
      );
    }

    let verification: CertificateVerificationDto | null;
    try {
      verification = await getCertificateVerificationByShortCode(normalizedCode);
    } catch {
      return <VerificationState />;
    }

    if (!verification) {
      return (
        <VerificationState
          message={`No issued certificate record was found matching verification code "${normalizedCode}".`}
          status="NOT FOUND"
          tone="error"
        />
      );
    }

    return <CertificateVerificationResultView verification={verification} />;
  }

  // Otherwise render the primary verification center with camera, upload, and manual lookup
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <div className="badge badge-primary badge-outline mb-2">
          Barangay Bato, Mauban, Quezon
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Certificate Verification Center
        </h1>
        <p className="mt-2 text-base text-base-content/75">
          Scan the QR code or enter the short verification code printed on any official
          Barangay Bato e-Certificate to validate its authenticity and status.
        </p>
      </div>

      <VerificationCenter />
    </main>
  );
}

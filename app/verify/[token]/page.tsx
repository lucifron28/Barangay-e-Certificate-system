import type { Metadata } from "next";
import { getDatabaseProvider } from "@/lib/db/provider";
import { getCertificateVerificationByToken } from "@/lib/db/queries";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import type { CertificateVerificationDto } from "@/types/database";
import {
  CertificateVerificationResultView,
  VerificationState,
} from "@/components/certificates/certificate-verification-view";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VerifyCertificateTokenPage({
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

  let verification: CertificateVerificationDto | null;
  try {
    verification = await getCertificateVerificationByToken(token);
  } catch {
    return <VerificationState />;
  }

  if (!verification) {
    return <VerificationState />;
  }

  return <CertificateVerificationResultView verification={verification} />;
}

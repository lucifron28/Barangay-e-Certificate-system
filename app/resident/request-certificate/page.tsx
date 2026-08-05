import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CertificateRequestForm } from "@/components/forms/certificate-request-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { SetupRequired } from "@/components/ui/setup-required";
import { requireResident } from "@/lib/auth/guards";
import { issuanceMode, getCertificateDeliveryCopy } from "@/lib/services/issuance-mode";

type RequestCertificatePageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

export default async function RequestCertificatePage({
  searchParams,
}: RequestCertificatePageProps) {
  const context = await requireResident();
  const params = await searchParams;

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const copy = getCertificateDeliveryCopy();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/resident/dashboard" className="btn btn-ghost btn-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Request Certificate</h1>
        <p className="mt-1 text-base-content/70">
          {copy.requestDescription}
        </p>
      </div>

      <FlashMessage error={params?.error} message={params?.message} />

      <CertificateRequestForm profile={context.profile} mode={issuanceMode} />
    </div>
  );
}

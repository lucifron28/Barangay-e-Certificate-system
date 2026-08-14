import { getDatabaseProvider, type DatabaseProvider } from "@/lib/db/provider";
import { env } from "@/lib/env";
import { hasCertificateStorageConfiguration } from "@/lib/certificates/private-storage";

export const CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE =
  "Certificate issuance is not configured for this deployment.";

export function isCertificateIssuanceConfigured(
  provider: DatabaseProvider = getDatabaseProvider(),
) {
  const storageReady = hasCertificateStorageConfiguration();
  return (
    (provider === "sqlite" && storageReady) ||
    (provider === "turso" && env.certificateStorageProvider === "vercel_blob" && storageReady)
  );
}

import { getDatabaseProvider, type DatabaseProvider } from "@/lib/db/provider";

export const CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE =
  "Certificate issuance is not configured for Supabase deployment mode yet.";

export function isCertificateIssuanceConfigured(
  provider: DatabaseProvider = getDatabaseProvider(),
) {
  // SQLite is the validated thesis/demo lifecycle. Supabase remains a reviewed
  // deployment boundary until its private PDF storage and issuer service exist.
  return provider === "sqlite";
}

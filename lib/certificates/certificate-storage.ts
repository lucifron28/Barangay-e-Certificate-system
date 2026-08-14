import "server-only";

import { getCertificateStorageProvider } from "@/lib/certificates/private-storage";
import type { CertificateRecord } from "@/types/database";

export function getRecordStorage(input: Pick<CertificateRecord, "pdf_path" | "pdf_storage_key" | "pdf_storage_provider">) {
  return {
    key: input.pdf_storage_key,
    path: input.pdf_path,
    provider: input.pdf_storage_provider || getCertificateStorageProvider(),
  } as const;
}

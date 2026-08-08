import type { CertificateRequest } from "@/types/database";
import type { CertificateType, RequestStatus } from "@/types/enums";

export type RequestStats = Record<
  "total" | RequestStatus,
  number
>;

export function summarizeRequests(
  requests: Pick<CertificateRequest, "status" | "certificate_type">[],
) {
  const stats: RequestStats = {
    accepted: 0,
    cancelled: 0,
    done: 0,
    pending: 0,
    ready_for_pickup: 0,
    ready_for_download: 0,
    rejected: 0,
    total: requests.length,
  };

  const certificateCounts = new Map<CertificateType, number>();

  for (const request of requests) {
    stats[request.status] += 1;
    certificateCounts.set(
      request.certificate_type,
      (certificateCounts.get(request.certificate_type) ?? 0) + 1,
    );
  }

  const mostRequested = [...certificateCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  return {
    stats,
    mostRequested: mostRequested ?? null,
  };
}

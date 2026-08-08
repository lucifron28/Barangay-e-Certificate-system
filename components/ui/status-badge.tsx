import { statusLabel } from "@/lib/utils/format";
import type { RequestStatus } from "@/types/enums";

const badgeClass: Record<RequestStatus, string> = {
  pending: "badge-warning",
  accepted: "badge-info",
  cancelled: "badge-neutral",
  rejected: "badge-error",
  ready_for_pickup: "badge-primary",
  ready_for_download: "badge-info",
  done: "badge-success",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`badge ${badgeClass[status]} badge-sm whitespace-nowrap`}>
      {statusLabel(status)}
    </span>
  );
}

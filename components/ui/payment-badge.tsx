import { paymentStatusLabel } from "@/lib/utils/format";
import type { PaymentStatus } from "@/types/enums";

const badgeClass: Record<PaymentStatus, string> = {
  free: "badge-info",
  paid: "badge-success",
  unpaid: "badge-warning",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`badge ${badgeClass[status]} badge-sm whitespace-nowrap`}>
      {paymentStatusLabel(status)}
    </span>
  );
}

import type { PaymentRecordStatus, PaymentStatus } from "@/types/enums";

export function PaymentBadge({
  recordStatus,
  status,
}: {
  status: PaymentStatus;
  recordStatus?: PaymentRecordStatus | null;
}) {
  if (status === "free") {
    return <span className="badge badge-info badge-sm whitespace-nowrap">Free</span>;
  }
  if (status === "paid" || recordStatus === "paid") {
    return (
      <span className="badge badge-success badge-sm whitespace-nowrap text-white">
        Verified / Paid
      </span>
    );
  }
  if (recordStatus === "pending") {
    return (
      <span className="badge badge-warning badge-sm whitespace-nowrap">
        Pending Verification
      </span>
    );
  }
  if (recordStatus === "failed") {
    return (
      <span className="badge badge-error badge-sm whitespace-nowrap text-white">
        Rejected
      </span>
    );
  }
  return (
    <span className="badge badge-warning badge-sm whitespace-nowrap">
      Awaiting Payment
    </span>
  );
}

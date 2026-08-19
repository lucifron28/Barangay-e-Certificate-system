export const CERTIFICATE_TYPES = [
  "barangay_clearance",
  "barangay_certificate",
  "barangay_indigency",
  "barangay_residency",
] as const;

export const REQUEST_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "ready_for_download",
  "done",
  "cancelled",
] as const;

export const PROFILE_ROLES = [
  "resident",
  "main_admin",
  "barangay_secretary",
] as const;

export const PAYMENT_STATUSES = ["unpaid", "paid", "free"] as const;
export const PAYMENT_PROVIDERS = ["gcash", "maya"] as const;
export const PAYMENT_RECORD_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "free",
] as const;

export const PAYMENT_REJECTION_REASONS = [
  "Reference not found",
  "Incorrect amount",
  "Wrong recipient",
  "Unreadable proof",
  "Duplicate transaction",
  "Other",
] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];
export type MockPaymentStatus = PaymentRecordStatus;
export type PaymentRejectionReason = (typeof PAYMENT_REJECTION_REASONS)[number];
export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  barangay_clearance: "Barangay Clearance",
  barangay_certificate: "Barangay Certificate / PAGPAPATUNAY",
  barangay_indigency: "Barangay Indigency",
  barangay_residency: "Barangay Residency",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  ready_for_download: "Ready for Download",
  done: "Done",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  free: "Free",
};
export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  gcash: "GCash",
  maya: "Maya",
};

export const PAYMENT_RECORD_STATUS_LABELS: Record<PaymentRecordStatus, string> = {
  pending: "Pending Verification",
  processing: "Processing",
  paid: "Verified / Paid",
  failed: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
  free: "Free",
};


export const CERTIFICATE_FEES: Record<CertificateType, number> = {
  barangay_clearance: 50,
  barangay_certificate: 50,
  barangay_indigency: 0,
  barangay_residency: 50,
};

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
  "ready_for_pickup",
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

export type CertificateType = (typeof CERTIFICATE_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  barangay_clearance: "Barangay Clearance",
  barangay_certificate: "Barangay Certificate",
  barangay_indigency: "Barangay Indigency",
  barangay_residency: "Barangay Residency",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  ready_for_pickup: "Ready for Pickup",
  ready_for_download: "Ready for Download",
  done: "Done",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  free: "Free",
};

export const CERTIFICATE_FEES: Record<CertificateType, number> = {
  barangay_clearance: 50,
  barangay_certificate: 50,
  barangay_indigency: 0,
  barangay_residency: 50,
};

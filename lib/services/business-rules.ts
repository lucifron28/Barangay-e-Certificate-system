import {
  CERTIFICATE_FEES,
  type CertificateType,
  type PaymentStatus,
  type RequestStatus,
} from "@/types/enums";

export function getCertificateFee(certificateType: CertificateType) {
  return CERTIFICATE_FEES[certificateType];
}

export function getDefaultPaymentStatus(
  certificateType: CertificateType,
): PaymentStatus {
  return certificateType === "barangay_indigency" ? "free" : "unpaid";
}

export function canCancelRequest(status: RequestStatus) {
  return status === "pending";
}

export function canResubmitRequest(status: RequestStatus) {
  return status === "rejected";
}

export function canRejectRequest(status: RequestStatus) {
  return status === "pending";
}

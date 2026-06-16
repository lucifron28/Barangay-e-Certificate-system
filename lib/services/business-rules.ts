import {
  CERTIFICATE_FEES,
  type CertificateType,
  type PaymentStatus,
  type RequestStatus,
} from "@/types/enums";

export const OFFICE_HOURS_LABEL = "Monday to Friday, 8:00 AM to 5:00 PM";

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

export function canScheduleRequest(status: RequestStatus) {
  return status === "accepted" || status === "ready_for_pickup";
}

export function canRejectRequest(status: RequestStatus) {
  return status === "pending";
}

export function canMarkReady(status: RequestStatus, hasSchedule: boolean) {
  return status === "accepted" && hasSchedule;
}

export function canMarkDone(status: RequestStatus) {
  return status === "ready_for_pickup";
}

export function isWithinOfficeHours(date: string, time: string) {
  const parsedDate = new Date(`${date}T00:00:00`);
  const day = parsedDate.getDay();
  const [hour = "0", minute = "0"] = time.split(":");
  const totalMinutes = Number(hour) * 60 + Number(minute);
  const startsAt = 8 * 60;
  const endsAt = 17 * 60;

  return day >= 1 && day <= 5 && totalMinutes >= startsAt && totalMinutes <= endsAt;
}

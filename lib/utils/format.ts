import {
  CERTIFICATE_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  type CertificateType,
  type PaymentStatus,
  type RequestStatus,
} from "@/types/enums";

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const [hour = "0", minute = "0"] = value.split(":");
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, Number(hour), Number(minute)));
}

export function certificateLabel(type: CertificateType | string) {
  return CERTIFICATE_TYPE_LABELS[type as CertificateType] ?? type;
}

export function statusLabel(status: RequestStatus | string) {
  return REQUEST_STATUS_LABELS[status as RequestStatus] ?? status;
}

export function paymentStatusLabel(status: PaymentStatus | string) {
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] ?? status;
}

export function formatCurrency(value: number | null | undefined) {
  if (!value) {
    return "Free";
  }

  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function toInputDate(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

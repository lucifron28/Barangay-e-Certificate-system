import { env } from "@/lib/env";

export type IssuanceMode = "fully_online_demo" | "hybrid_physical_original";

export const issuanceMode: IssuanceMode = env.certificateIssuanceMode;
export const isFullyOnlineDemo = issuanceMode === "fully_online_demo";
export const isHybridPhysicalOriginal = issuanceMode === "hybrid_physical_original";

export function getIssuanceModeLabel(mode: IssuanceMode = issuanceMode) {
  return mode === "fully_online_demo"
    ? "Fully online thesis demo"
    : "Hybrid physical-original workflow";
}

export function getCertificateDeliveryCopy(mode: IssuanceMode = issuanceMode) {
  if (mode === "fully_online_demo") {
    return {
      requestDescription: "Submit online, complete the demo payment when accepted, and download your verified certificate PDF.",
      dashboardDescription: "Track reviews, demo payments, verified PDF certificates, and QR status.",
      issuedDescription: "Issued certificates are available as secure PDF downloads for three days.",
      emailDelivery: "Your certificate is ready as a secure PDF download in the Barangay Bato e-Certificate System.",
    } as const;
  }

  return {
    requestDescription: "Submit online, then follow the assigned pickup schedule after review.",
    dashboardDescription: "Track your certificate requests and pickup schedules.",
    issuedDescription: "Issued certificates are prepared for the assigned office workflow.",
    emailDelivery: "Please follow the assigned pickup schedule for your certificate.",
  } as const;
}

export function canUsePickupWorkflow(mode: IssuanceMode = issuanceMode) {
  return mode === "hybrid_physical_original";
}

export function canIssueOnlineCertificate(mode: IssuanceMode = issuanceMode) {
  return mode === "fully_online_demo";
}

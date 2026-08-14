export const issuanceMode = "fully_online_demo" as const;
export const isFullyOnlineDemo = true;

export function getIssuanceModeLabel() {
  return "Online certificate delivery";
}

export function getCertificateDeliveryCopy() {
  return {
    requestDescription:
      "Submit online, complete the simulated payment when accepted, and download your verified certificate PDF.",
    dashboardDescription:
      "Track reviews, simulated payments, verified PDF certificates, and QR status.",
    issuedDescription:
      "Issued certificates are available as secure PDF downloads for 72 hours from issuance.",
    emailDelivery:
      "Your certificate is ready as a secure PDF download in the Barangay Bato e-Certificate System.",
  } as const;
}

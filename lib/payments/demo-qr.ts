import "server-only";

import QRCode from "qrcode";
import type { PaymentProvider } from "@/types/enums";

export async function createDemoPaymentQr(provider: PaymentProvider) {
  return QRCode.toBuffer(
    `BARANGAY_BATO_DEMO_PAYMENT|${provider.toUpperCase()}|DO_NOT_SEND_MONEY`,
    {
      errorCorrectionLevel: "M",
      margin: 2,
      type: "png",
      width: 640,
    },
  );
}

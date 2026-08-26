import type {
  PaymentMethodConfig,
  PaymentReceivingSettings,
} from "@/types/database";
import type { PaymentProvider } from "@/types/enums";

export const DEMO_PAYMENT_QR_PREFIX = "demo-payment-qr:";

export function getDemoPaymentMethodConfig(
  provider: PaymentProvider,
): PaymentMethodConfig {
  return {
    enabled: true,
    merchantName: `DEMO ${provider === "gcash" ? "GCash" : "Maya"} Account`,
    qrStorageKey: `${DEMO_PAYMENT_QR_PREFIX}${provider}`,
    qrStorageProvider: null,
    qrUpdatedAt: null,
  };
}

export function isDemoPaymentQrKey(key: string | null): boolean {
  return Boolean(key?.startsWith(DEMO_PAYMENT_QR_PREFIX));
}

export function isDemoPaymentMethodConfig(
  config: PaymentMethodConfig,
): boolean {
  return isDemoPaymentQrKey(config.qrStorageKey);
}

export function applyDemoPaymentFallback(
  settings: PaymentReceivingSettings,
  demoMode: boolean,
): PaymentReceivingSettings {
  if (!demoMode) {
    return settings;
  }

  return {
    gcash: settings.gcash.enabled
      ? settings.gcash
      : getDemoPaymentMethodConfig("gcash"),
    maya: settings.maya.enabled
      ? settings.maya
      : getDemoPaymentMethodConfig("maya"),
  };
}

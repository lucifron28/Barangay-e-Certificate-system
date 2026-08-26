import { describe, expect, it } from "vitest";
import type { PaymentReceivingSettings } from "@/types/database";
import {
  applyDemoPaymentFallback,
  getDemoPaymentMethodConfig,
  isDemoPaymentMethodConfig,
} from "@/lib/payments/demo-config";

const disabledPaymentSettings: PaymentReceivingSettings = {
  gcash: {
    enabled: false,
    merchantName: "",
    qrStorageKey: null,
    qrStorageProvider: null,
    qrUpdatedAt: null,
  },
  maya: {
    enabled: false,
    merchantName: "",
    qrStorageKey: null,
    qrStorageProvider: null,
    qrUpdatedAt: null,
  },
};

describe("thesis demo payment mode", () => {
  it("makes both payment methods available with non-payment QR markers", () => {
    const settings = applyDemoPaymentFallback(disabledPaymentSettings, true);

    expect(settings.gcash.enabled).toBe(true);
    expect(settings.maya.enabled).toBe(true);
    expect(isDemoPaymentMethodConfig(settings.gcash)).toBe(true);
    expect(isDemoPaymentMethodConfig(settings.maya)).toBe(true);
    expect(settings.gcash.merchantName).toBe("DEMO GCash Account");
  });

  it("leaves real configured methods unchanged", () => {
    const realGcash = getDemoPaymentMethodConfig("gcash");
    realGcash.merchantName = "Barangay Bato Official GCash";
    realGcash.qrStorageKey = "merchant-qr/gcash.png";
    realGcash.qrStorageProvider = "local";

    const settings = applyDemoPaymentFallback(
      { ...disabledPaymentSettings, gcash: realGcash },
      true,
    );

    expect(settings.gcash).toBe(realGcash);
    expect(settings.maya.merchantName).toBe("DEMO Maya Account");
  });

  it("does not activate demo methods when the switch is off", () => {
    const settings = applyDemoPaymentFallback(disabledPaymentSettings, false);

    expect(settings).toBe(disabledPaymentSettings);
    expect(settings.gcash.enabled).toBe(false);
    expect(settings.maya.enabled).toBe(false);
  });
});

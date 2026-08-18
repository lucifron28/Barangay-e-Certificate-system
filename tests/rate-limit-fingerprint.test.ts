import { describe, expect, it } from "vitest";
import { resolveClientFingerprint } from "@/lib/security/rate-limit";

describe("production rate-limit fingerprints", () => {
  it("uses Vercel's trusted forwarded client header", () => {
    const fingerprint = resolveClientFingerprint(
      new Headers({
        "user-agent": "browser",
        "x-forwarded-for": "spoofed.example",
        "x-vercel-forwarded-for": "203.0.113.10",
      }),
      { isVercel: true, trustProxy: false },
    );

    expect(fingerprint).toBe("vercel-ip:203.0.113.10");
  });

  it("does not trust x-forwarded-for on an untrusted deployment", () => {
    const fingerprint = resolveClientFingerprint(
      new Headers({
        "user-agent": "browser",
        "x-forwarded-for": "203.0.113.10",
      }),
      { isVercel: false, trustProxy: false },
    );

    expect(fingerprint).toBe("ua:browser");
  });

  it("allows x-forwarded-for only when an explicit proxy trust path is enabled", () => {
    const fingerprint = resolveClientFingerprint(
      new Headers({
        "user-agent": "browser",
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      }),
      { isVercel: false, trustProxy: true },
    );

    expect(fingerprint).toBe("proxy-ip:203.0.113.10");
  });
});

import { describe, expect, it } from "vitest";
import {
  validatePublicAppUrl,
  buildVerificationUrl,
} from "@/lib/certificates/verification-url";

describe("verification URL configuration and validation", () => {
  const sampleToken = "4Qde1MkUKaVQCnzR9WGVkbNQkJ0wXlCQRYH8RowCFCo";

  it("allows localhost for SQLite mode when NEXT_PUBLIC_APP_URL is empty", () => {
    const origin = validatePublicAppUrl(undefined, "sqlite");
    expect(origin).toBe("http://localhost:3000");

    const url = buildVerificationUrl(sampleToken, "sqlite");
    expect(url).toBe(`http://localhost:3000/verify/${sampleToken}`);
  });

  it("uses explicitly configured local/LAN NEXT_PUBLIC_APP_URL in SQLite mode", () => {
    const origin = validatePublicAppUrl("http://192.168.1.50:3000", "sqlite");
    expect(origin).toBe("http://192.168.1.50:3000");

    const url = buildVerificationUrl(sampleToken, "sqlite");
    expect(url).toContain(sampleToken);
  });

  it("accepts valid production HTTPS URL in Turso mode", () => {
    const prodUrl = "https://barangay-bato-ecertificate-system.vercel.app";
    const origin = validatePublicAppUrl(prodUrl, "turso");
    expect(origin).toBe("https://barangay-bato-ecertificate-system.vercel.app");

    const tokenUrl = `${origin}/verify/${sampleToken}`;
    expect(tokenUrl).toBe(
      `https://barangay-bato-ecertificate-system.vercel.app/verify/${sampleToken}`,
    );
  });

  it("rejects missing or empty NEXT_PUBLIC_APP_URL in Turso mode", () => {
    expect(() => validatePublicAppUrl(undefined, "turso")).toThrow(
      /NEXT_PUBLIC_APP_URL is required in production Turso mode/,
    );
    expect(() => validatePublicAppUrl("", "turso")).toThrow(
      /NEXT_PUBLIC_APP_URL is required in production Turso mode/,
    );
    expect(() => validatePublicAppUrl("   ", "turso")).toThrow(
      /NEXT_PUBLIC_APP_URL is required in production Turso mode/,
    );
  });

  it("rejects http://localhost:3000 in Turso mode", () => {
    expect(() => validatePublicAppUrl("http://localhost:3000", "turso")).toThrow(
      /production Turso mode requires https:\/\/ protocol/,
    );
    expect(() => validatePublicAppUrl("https://localhost:3000", "turso")).toThrow(
      /does not permit private\/local hostname/,
    );
  });

  it("rejects http://127.0.0.1:3000 in Turso mode", () => {
    expect(() => validatePublicAppUrl("http://127.0.0.1:3000", "turso")).toThrow(
      /production Turso mode requires https:\/\/ protocol/,
    );
    expect(() => validatePublicAppUrl("https://127.0.0.1:3000", "turso")).toThrow(
      /does not permit private\/local hostname/,
    );
  });

  it("rejects private LAN IP addresses in Turso mode", () => {
    expect(() => validatePublicAppUrl("https://192.168.1.100", "turso")).toThrow(
      /does not permit private\/local hostname/,
    );
    expect(() => validatePublicAppUrl("https://10.0.0.1", "turso")).toThrow(
      /does not permit private\/local hostname/,
    );
    expect(() => validatePublicAppUrl("https://172.20.0.5", "turso")).toThrow(
      /does not permit private\/local hostname/,
    );
  });

  it("rejects non-HTTPS public URLs in Turso mode", () => {
    expect(() =>
      validatePublicAppUrl("http://barangay-bato-ecertificate-system.vercel.app", "turso"),
    ).toThrow(/production Turso mode requires https:\/\/ protocol/);
  });

  it("strips trailing slashes safely and encodes the token path", () => {
    const origin = validatePublicAppUrl(
      "https://barangay-bato-ecertificate-system.vercel.app/",
      "turso",
    );
    expect(origin).toBe("https://barangay-bato-ecertificate-system.vercel.app");
  });
});

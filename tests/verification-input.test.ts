import { describe, expect, it } from "vitest";
import {
  parseVerificationInput,
  normalizeShortVerificationCode,
} from "@/lib/certificates/verification-input";

describe("verification input parser and security validator", () => {
  const validToken = "4Qde1MkUKaVQCnzR9WGVkbNQkJ0wXlCQRYH8RowCFCo";
  const validCode = "BB-A1B2C3D4";
  const trustedOrigin = "https://barangay-bato-ecertificate-system.vercel.app";

  it("accepts valid BB-XXXXXXXX short codes and normalizes lowercase input", () => {
    expect(normalizeShortVerificationCode("bb-a1b2c3d4")).toBe("BB-A1B2C3D4");
    expect(normalizeShortVerificationCode("  BB-12345678  ")).toBe("BB-12345678");
    expect(normalizeShortVerificationCode("invalid-code")).toBeNull();

    const parsed = parseVerificationInput("bb-a1b2c3d4");
    expect(parsed).toEqual({
      code: "BB-A1B2C3D4",
      navigationPath: "/verify?code=BB-A1B2C3D4",
      type: "short_code",
      valid: true,
    });
  });

  it("accepts raw 43-character base64url verification tokens", () => {
    const parsed = parseVerificationInput(validToken);
    expect(parsed).toEqual({
      navigationPath: `/verify/${validToken}`,
      token: validToken,
      type: "token",
      valid: true,
    });
  });

  it("accepts relative /verify/<token> paths", () => {
    const parsed = parseVerificationInput(`/verify/${validToken}`);
    expect(parsed).toEqual({
      navigationPath: `/verify/${validToken}`,
      token: validToken,
      type: "token",
      valid: true,
    });
  });

  it("accepts valid same-origin full URLs and extracts internal navigation", () => {
    const fullUrl = `${trustedOrigin}/verify/${validToken}`;
    const parsed = parseVerificationInput(fullUrl, {
      trustedOrigins: [trustedOrigin],
    });

    expect(parsed).toEqual({
      navigationPath: `/verify/${validToken}`,
      token: validToken,
      type: "token",
      valid: true,
    });

    // Ensure it returns internal relative path, not external URL
    if (parsed.valid) {
      expect(parsed.navigationPath).toBe(`/verify/${validToken}`);
      expect(parsed.navigationPath).not.toContain("https://");
    }
  });

  it("accepts same-origin short code URLs", () => {
    const codeUrl = `${trustedOrigin}/verify?code=${validCode}`;
    const parsed = parseVerificationInput(codeUrl, {
      trustedOrigins: [trustedOrigin],
    });

    expect(parsed).toEqual({
      code: validCode,
      navigationPath: `/verify?code=${validCode}`,
      type: "short_code",
      valid: true,
    });
  });

  it("rejects external untrusted origins", () => {
    const evilUrl = `https://evil.example.com/verify/${validToken}`;
    const parsed = parseVerificationInput(evilUrl, {
      trustedOrigins: [trustedOrigin],
    });

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.error).toContain("not a Barangay Bato certificate verification code");
    }
  });

  it("rejects protocol-relative and scheme-based injection payloads", () => {
    const maliciousInputs = [
      `//evil.example.com/verify/${validToken}`,
      "javascript:alert(document.domain)",
      "javascript:window.location='https://evil.com'",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
    ];

    for (const input of maliciousInputs) {
      const parsed = parseVerificationInput(input, {
        trustedOrigins: [trustedOrigin],
      });
      expect(parsed.valid, `Input "${input}" should be rejected`).toBe(false);
    }
  });

  it("rejects unauthorized internal application routes", () => {
    const invalidRoutes = [
      "/admin/dashboard",
      "/admin/certificate-requests",
      "/resident/dashboard",
      "/resident/request-certificate",
      "/login",
      "/register",
      "/api/auth",
      "/verify",
    ];

    for (const route of invalidRoutes) {
      const parsed = parseVerificationInput(route);
      expect(parsed.valid, `Route "${route}" should be rejected`).toBe(false);
    }
  });

  it("rejects empty, whitespace, malformed, and oversized inputs", () => {
    expect(parseVerificationInput("").valid).toBe(false);
    expect(parseVerificationInput("   ").valid).toBe(false);
    expect(parseVerificationInput(null).valid).toBe(false);
    expect(parseVerificationInput(undefined).valid).toBe(false);
    expect(parseVerificationInput("A".repeat(3000)).valid).toBe(false);
    expect(parseVerificationInput("not-a-token-or-code").valid).toBe(false);
  });
});

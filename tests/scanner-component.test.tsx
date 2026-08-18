import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VerificationCenter } from "@/components/verification/verification-center";
import { parseVerificationInput } from "@/lib/certificates/verification-input";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("public VerificationCenter scanner component", () => {
  it("renders the verification center in idle state without requesting camera", () => {
    const markup = renderToStaticMarkup(<VerificationCenter />);

    // Must contain the three core verification methods
    expect(markup).toContain("Scan QR Code");
    expect(markup).toContain("Upload QR Image");
    expect(markup).toContain("Manual Verification Code or Link");

    // Camera access MUST require explicit user action (Start Camera button visible)
    expect(markup).toContain("Start Camera");
    expect(markup).toContain(
      "Camera access is requested only after you click Start Camera.",
    );

    // Video stream must NOT be active in idle state
    expect(markup).not.toContain("<video");

    // Must contain privacy and verification limitations notice
    expect(markup).toContain("Privacy and Verification Notice");
    expect(markup).toContain("processed entirely on your device");
  });

  it("provides client-only image upload input without server upload endpoint", () => {
    const markup = renderToStaticMarkup(<VerificationCenter />);

    expect(markup).toContain('type="file"');
    expect(markup).toContain('accept="image/*"');
    expect(markup).toContain("Select QR Image File");
    expect(markup).toContain("decoded securely on your device");

    // Must not contain any server upload action
    expect(markup).not.toContain('action="/api/upload"');
    expect(markup).not.toContain('action="/upload"');
  });

  it("provides manual verification code and token input form", () => {
    const markup = renderToStaticMarkup(<VerificationCenter />);

    expect(markup).toContain('placeholder="e.g. BB-A1B2C3D4 or /verify/..."');
    expect(markup).toContain("Verify");
  });

  it("evaluates valid QR tokens through the pure parser", () => {
    const validToken = "4Qde1MkUKaVQCnzR9WGVkbNQkJ0wXlCQRYH8RowCFCo";
    const result = parseVerificationInput(validToken);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.navigationPath).toBe(`/verify/${validToken}`);
    }
  });

  it("evaluates valid short verification codes through the pure parser", () => {
    const validCode = "bb-12345678";
    const result = parseVerificationInput(validCode);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.type).toBe("short_code");
      expect(result.navigationPath).toBe("/verify?code=BB-12345678");
    }
  });

  it("rejects malicious or external QR inputs from the scanner", () => {
    const evilInputs = [
      "https://phishing-site.example/verify/fake-token",
      "javascript:alert(1)",
      "data:text/html,malicious",
      "/admin/secret-page",
    ];

    for (const input of evilInputs) {
      const result = parseVerificationInput(input, {
        trustedOrigins: ["https://barangay-bato-ecertificate-system.vercel.app"],
      });
      expect(result.valid).toBe(false);
    }
  });
});

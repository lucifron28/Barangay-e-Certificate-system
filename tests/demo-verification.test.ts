import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCertificateVerificationByToken } from "@/lib/db/sqlite/queries";

type DemoSample = {
  certificateNumber: string;
  label: "EXPIRED" | "REVOKED" | "VALID";
  token: string;
};

describe("demo verification samples", () => {
  it("resolve from their seeded metadata as valid, expired, and revoked", () => {
    const samples = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data", "test-verification-samples.json"),
        "utf8",
      ),
    ) as DemoSample[];
    const byLabel = new Map(
      samples.map((sample) => [
        sample.label,
        getCertificateVerificationByToken(sample.token),
      ]),
    );

    expect(byLabel.get("VALID")?.status).toBe("valid");
    expect(byLabel.get("EXPIRED")?.status).toBe("expired");
    expect(byLabel.get("REVOKED")?.status).toBe("revoked");
  });
});

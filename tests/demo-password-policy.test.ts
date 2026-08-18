import { describe, expect, it } from "vitest";
import {
  assertStrongDemoPassword,
  DEMO_PASSWORD_MIN_LENGTH,
} from "@/lib/auth/demo-password-policy";

describe("demo seed password policy", () => {
  it("requires an explicit strong value", () => {
    expect(() => assertStrongDemoPassword("DEMO_PASSWORD", "short")).toThrow(
      `${DEMO_PASSWORD_MIN_LENGTH} characters`,
    );
    expect(() => assertStrongDemoPassword("DEMO_PASSWORD", "demo-password-value")).toThrow(
      "too predictable",
    );
  });

  it("accepts a non-predictable presentation value", () => {
    expect(
      assertStrongDemoPassword(
        "DEMO_PASSWORD",
        "river-lantern-archive-2026",
      ),
    ).toBe("river-lantern-archive-2026");
  });
});

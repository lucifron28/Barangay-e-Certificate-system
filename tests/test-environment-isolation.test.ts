import { describe, expect, it } from "vitest";

const remoteSecretNames = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
];

describe("test environment isolation", () => {
  it("overrides parent-process remote credentials", () => {
    expect(process.env.DATABASE_PROVIDER).toBe("sqlite");
    expect(process.env.CERTIFICATE_STORAGE_PROVIDER).toBe("local");

    for (const name of remoteSecretNames) {
      expect(process.env[name], `${name} must be blank in npm test`).toBe("");
    }
  });
});

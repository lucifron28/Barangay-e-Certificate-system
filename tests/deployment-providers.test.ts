import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDatabaseProvider } from "@/lib/db/provider";
import { hasTursoCredentials, getTursoDb } from "@/lib/db/turso/client";
import { env, getProductionEnvErrors } from "@/lib/env";
import { hasCertificateStorageConfiguration } from "@/lib/certificates/private-storage";
import { isCertificateIssuanceConfigured } from "@/lib/services/certificate-lifecycle";

describe("deployment provider boundaries", () => {
  it("defaults local development to SQLite", () => {
    expect(getDatabaseProvider()).toBe("sqlite");
  });

  it("does not import or fall back to the native SQLite driver in Turso code", () => {
    const tursoSource = readFileSync(
      join(process.cwd(), "lib", "db", "turso", "queries.ts"),
      "utf8",
    );
    expect(tursoSource).not.toContain("better-sqlite3");
    expect(tursoSource).not.toContain("lib/db/sqlite");
    if (!hasTursoCredentials()) {
      expect(() => getTursoDb()).toThrow(/Turso mode requires/);
    }
  });

  it("fails closed for private Blob storage until its token is configured", () => {
    if (env.certificateStorageProvider === "vercel_blob" && !env.blobReadWriteToken) {
      expect(hasCertificateStorageConfiguration()).toBe(false);
    } else {
      expect(hasCertificateStorageConfiguration()).toBe(true);
    }
  });

  it("does not enable Turso issuance with local file storage", () => {
    expect(isCertificateIssuanceConfigured("turso")).toBe(
      env.certificateStorageProvider === "vercel_blob" && Boolean(env.blobReadWriteToken),
    );
  });

  it("keeps migrations versioned and ordered", () => {
    const source = readFileSync(join(process.cwd(), "lib", "db", "migrations.ts"), "utf8");
    expect(source).toContain("0000_initial_schema.sql");
    expect(source).toContain("0001_client_deployment.sql");
    expect(source).toContain("schema_migrations");
  });

  it("keeps the canonical tables in the shared migration", () => {
    const source = readFileSync(
      join(process.cwd(), "database", "migrations", "0000_initial_schema.sql"),
      "utf8",
    );
    for (const table of [
      "profiles",
      "certificate_requests",
      "pickup_schedules",
      "certificate_records",
      "payments",
      "payment_events",
      "certificate_verifications",
      "certificate_download_logs",
      "notification_logs",
      "activity_logs",
      "system_settings",
      "document_counters",
      "rate_limit_attempts",
    ]) {
      expect(source).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("keeps certificate storage private and production configuration fail-closed", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "certificates", "private-storage.ts"),
      "utf8",
    );
    expect(source).toContain('access: "private"');
    expect(source).not.toContain('access: "public"');
    expect(getProductionEnvErrors().length).toBeGreaterThan(0);
  });

  it("keeps concurrent Turso issuance safeguards transaction-backed", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "db", "turso", "queries.ts"),
      "utf8",
    );
    expect(source).toContain("transactionAsync");
    expect(source).toContain("issuance_reservations");
    expect(source).toContain("ON CONFLICT(counter_type, year)");
    expect(source).toContain("CERTIFICATE_ISSUANCE_RESERVATION_FAILED");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";

const migration = readFileSync(
  join(
    process.cwd(),
    "database",
    "migrations",
    "20260808000100_final_defense_supabase_boundary.sql",
  ),
  "utf8",
);
const adminActions = readFileSync(
  join(process.cwd(), "lib", "actions", "admin.ts"),
  "utf8",
);

describe("Supabase thesis boundary", () => {
  it("keeps certificate issuance explicitly SQLite-only until the service exists", () => {
    expect(isCertificateIssuanceConfigured("sqlite")).toBe(true);
    expect(isCertificateIssuanceConfigured("supabase")).toBe(false);
    expect(adminActions).toContain("CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE");
    expect(CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE).toContain(
      "Supabase deployment mode",
    );
    expect(adminActions).not.toContain('from("certificate_records").upsert');
  });

  it("removes permissive settings policies and restricts writes to Main Admin", () => {
    expect(migration).toContain('create policy "Admin-side users can view system settings"');
    expect(migration).toContain('create policy "Main Admin can insert system settings"');
    expect(migration).toContain('create policy "Main Admin can update system settings"');
    expect(migration).toContain('create policy "Main Admin can delete system settings"');
    expect(migration).toContain('drop policy if exists "Admins can manage system settings"');
    expect(migration).toContain('drop policy if exists "Main Admin manages system settings"');
  });

  it("uses atomic yearly counters and fails closed for resident payment creation", () => {
    expect(migration).toContain("app_private.allocate_document_counter");
    expect(migration).toContain("on conflict (counter_type, year)");
    expect(migration).toContain("app_private.generate_certificate_number");
    expect(migration).not.toContain("count(*) + 1");
    expect(migration).toContain('drop policy if exists "Residents create own accepted payments"');
    expect(migration).not.toContain('create policy "Residents create own accepted payments"');
    expect(migration).toContain("revoke all on function app_private.allocate_document_counter");
  });
});

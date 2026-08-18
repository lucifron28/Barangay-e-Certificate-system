import { describe, expect, it } from "vitest";
import {
  getTursoQaRequests,
  buildTursoQaRequestStatements,
  buildTursoQaActivityStatements,
  buildTursoQaSystemSettingStatements,
} from "@/lib/seed/turso-qa-fixtures";
import { CERTIFICATE_TYPES } from "@/types/enums";

describe("Turso QA sample fixtures", () => {
  const currentYear = 2026;
  const requests = getTursoQaRequests(currentYear);

  it("builds exactly four canonical request fixtures", () => {
    expect(requests).toHaveLength(4);
  });

  it("contains exactly one canonical sample for each of the four certificate types", () => {
    const types = requests.map((req) => req.certificateType);
    expect(new Set(types).size).toBe(4);
    for (const type of CERTIFICATE_TYPES) {
      expect(types).toContain(type);
    }
  });

  it("assigns four unique IDs and four unique request numbers", () => {
    const ids = requests.map((req) => req.id);
    const numbers = requests.map((req) => req.requestNumber);

    expect(new Set(ids).size).toBe(4);
    expect(new Set(numbers).size).toBe(4);

    for (const id of ids) {
      expect(id).toMatch(/^10000000-0000-4000-8000-00000000900[1-4]$/);
    }
    for (const number of numbers) {
      expect(number).toMatch(/^REQ-2026-900[1-4]$/);
    }
  });

  it("includes a valid PAGPAPATUNAY fixture matching the confirmed field model", () => {
    const pagpapatunay = requests.find(
      (req) => req.certificateType === "barangay_certificate",
    );
    expect(pagpapatunay).toBeDefined();
    expect(pagpapatunay?.requestNumber).toBe("REQ-2026-9004");
    expect(pagpapatunay?.id).toBe("10000000-0000-4000-8000-000000009004");

    const submitted = JSON.parse(pagpapatunay!.submittedData) as {
      certificate_specific: Record<string, unknown>;
      common: Record<string, unknown>;
    };

    expect(submitted.certificate_specific.place_of_birth).toBe("Mauban, Quezon");
    expect(submitted.common.full_name).toBeDefined();
    expect(submitted.common.age).toBeDefined();
    expect(submitted.common.contact_number).toBeDefined();
    expect(submitted.common.purpose).toBe("Scholarship requirement");

    // Must not invent unconfirmed historical fields
    expect(submitted.certificate_specific.father_name).toBeUndefined();
    expect(submitted.certificate_specific.mother_name).toBeUndefined();
    expect(submitted.certificate_specific.annual_income).toBeUndefined();
    expect(submitted.certificate_specific.taxable_land).toBeUndefined();
  });

  it("generates request-only statements without profile/password/session updates", () => {
    const requestStatements = buildTursoQaRequestStatements(requests);
    const activityStatements = buildTursoQaActivityStatements(requests);
    const systemStatements = buildTursoQaSystemSettingStatements();

    const allStatements = [
      ...requestStatements,
      ...activityStatements,
      ...systemStatements,
    ];

    for (const statement of allStatements) {
      expect(statement.sql).not.toContain("UPDATE profiles");
      expect(statement.sql).not.toContain("password_hash");
      expect(statement.sql).not.toContain("UPDATE auth_sessions");
      expect(statement.sql).not.toContain("DELETE");
      expect(statement.sql).not.toContain("DROP");
    }
  });

  it("does not require password environment variables for request-only seed", () => {
    // Pure function executes cleanly without reading DEMO_ADMIN_PASSWORD or DEMO_RESIDENT_PASSWORD
    expect(() => {
      const fixtures = getTursoQaRequests();
      const stmts = buildTursoQaRequestStatements(fixtures);
      expect(stmts.length).toBe(4);
    }).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_FEES,
} from "@/types/enums";
import {
  CERTIFICATE_FIELD_REQUIREMENTS,
  getCertificateFieldRequirements,
} from "@/lib/services/certificate-fields";
import {
  HISTORICAL_CERTIFICATE_TYPES,
  calculateHistoricalCertificateBodyLayout,
} from "@/lib/certificates/historical-layout";
import { certificateTemplateTitle } from "@/lib/certificates/template-copy";

describe("canonical four-certificate catalog", () => {
  it("defines exactly four unique supported certificate types", () => {
    expect(CERTIFICATE_TYPES).toHaveLength(4);
    const uniqueTypes = new Set(CERTIFICATE_TYPES);
    expect(uniqueTypes.size).toBe(4);
    expect(CERTIFICATE_TYPES).toEqual([
      "barangay_clearance",
      "barangay_certificate",
      "barangay_indigency",
      "barangay_residency",
    ]);
  });

  it("retains barangay_certificate with a user-facing label containing PAGPAPATUNAY", () => {
    expect(CERTIFICATE_TYPES).toContain("barangay_certificate");
    const label = CERTIFICATE_TYPE_LABELS.barangay_certificate;
    expect(label).toBe("Barangay Certificate / PAGPAPATUNAY");
    expect(label).toContain("PAGPAPATUNAY");
  });

  it("provides labels and fees for all four certificate types", () => {
    for (const type of CERTIFICATE_TYPES) {
      expect(CERTIFICATE_TYPE_LABELS[type]).toBeDefined();
      expect(typeof CERTIFICATE_TYPE_LABELS[type]).toBe("string");
      expect(CERTIFICATE_TYPE_LABELS[type].length).toBeGreaterThan(0);
      expect(CERTIFICATE_FEES[type]).toBeDefined();
      expect(typeof CERTIFICATE_FEES[type]).toBe("number");
    }
  });

  it("defines field requirements for all four certificate types", () => {
    for (const type of CERTIFICATE_TYPES) {
      const requirements = getCertificateFieldRequirements(type);
      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(0);
      expect(CERTIFICATE_FIELD_REQUIREMENTS[type]).toBeDefined();
    }

    // PAGPAPATUNAY confirmed field model: full_name, age, contact_number, place_of_birth, purpose
    const pagpapatunayFields = getCertificateFieldRequirements("barangay_certificate").map(
      (req) => req.name,
    );
    expect(pagpapatunayFields).toContain("place_of_birth");
    expect(pagpapatunayFields).toContain("full_name");
    expect(pagpapatunayFields).toContain("age");
    expect(pagpapatunayFields).toContain("contact_number");
    expect(pagpapatunayFields).toContain("purpose");
    // Ensure unsupported historical fields are not in the current request requirements
    expect(pagpapatunayFields).not.toContain("father_name");
    expect(pagpapatunayFields).not.toContain("mother_name");
  });

  it("ensures historical renderer supports all four certificate types including PAGPAPATUNAY", async () => {
    expect(HISTORICAL_CERTIFICATE_TYPES).toHaveLength(4);
    for (const type of CERTIFICATE_TYPES) {
      expect(HISTORICAL_CERTIFICATE_TYPES).toContain(type);
    }
    expect(certificateTemplateTitle("barangay_certificate")).toBe("PAGPAPATUNAY");
    const layout = await calculateHistoricalCertificateBodyLayout({
      request: {
        cancelled_at: null,
        certificate_type: "barangay_certificate",
        control_number: null,
        created_at: new Date().toISOString(),
        date_accepted: null,
        date_released: null,
        date_requested: new Date().toISOString(),
        fee_amount: 50,
        id: "10000000-0000-4000-8000-000000000001",
        payment_status: "unpaid",
        purpose: "Scholarship requirement",
        remarks: null,
        request_number: "REQ-2026-0001",
        resident: {
          address_sitio: "Sitio Centro",
          age: 28,
          date_of_birth: "1998-03-12",
          full_name: "Juan Demo Resident",
        },
        resident_id: "00000000-0000-4000-8000-000000000003",
        status: "pending",
        submitted_data: {
          certificate_specific: {
            birthdate: null,
            place_of_birth: "Mauban, Quezon",
            years_of_residency: null,
          },
          common: {
            address_sitio: "Sitio Centro",
            age: 28,
            contact_number: "09170000001",
            full_name: "Juan Demo Resident",
            purpose: "Scholarship requirement",
          },
        },
        updated_at: new Date().toISOString(),
      },
    });
    expect(layout.endY).toBeGreaterThanOrEqual(328);
  });
});

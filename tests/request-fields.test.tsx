import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CertificateRequestForm } from "@/components/forms/certificate-request-form";
import { getSubmittedInformation } from "@/lib/services/submitted-data";
import { getCertificateFieldRequirements } from "@/lib/services/certificate-fields";
import { certificateRequestSchema } from "@/lib/validations/request";
import type { CertificateRequest, Json, Profile } from "@/types/database";
import type { CertificateType } from "@/types/enums";

const profile: Profile = {
  id: "resident-test",
  auth_user_id: null,
  full_name: "Juan Demo Resident",
  age: 28,
  address_sitio: "Sitio Centro",
  date_of_birth: "1998-03-12",
  civil_status: "Single",
  contact_number: "09170000001",
  gender: "Male",
  occupation: "Farmer",
  email: "resident@example.com",
  username: "juanresident",
  password_hash: null,
  role: "resident",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const requestBase: CertificateRequest = {
  id: "request-test",
  request_number: "REQ-2026-0001",
  resident_id: profile.id,
  certificate_type: "barangay_certificate",
  purpose: "Scholarship requirement",
  status: "pending",
  remarks: null,
  submitted_data: {
    common: {
      full_name: "Juan Demo Resident",
      age: 28,
      contact_number: "09170000001",
      purpose: "Scholarship requirement",
    },
    certificate_specific: {
      place_of_birth: "Mauban, Quezon",
    },
  } as Json,
  control_number: null,
  fee_amount: 50,
  payment_status: "unpaid",
  date_requested: "2026-01-01T00:00:00.000Z",
  date_accepted: null,
  date_released: null,
  cancelled_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const valuesFor: Record<CertificateType, Record<string, string | number>> = {
  barangay_clearance: {
    age: 28,
    certificate_type: "barangay_clearance",
    contact_number: "09170000001",
    full_name: "Juan Demo Resident",
    purpose: "Employment requirement",
    sitio: "Sitio Centro",
  },
  barangay_certificate: {
    age: 28,
    certificate_type: "barangay_certificate",
    contact_number: "09170000001",
    full_name: "Juan Demo Resident",
    place_of_birth: "Mauban, Quezon",
    purpose: "Scholarship requirement",
  },
  barangay_indigency: {
    age: 28,
    certificate_type: "barangay_indigency",
    contact_number: "09170000001",
    full_name: "Juan Demo Resident",
    purpose: "Medical assistance",
    sitio: "Sitio Centro",
  },
  barangay_residency: {
    age: 28,
    birthdate: "1998-03-12",
    certificate_type: "barangay_residency",
    contact_number: "09170000001",
    full_name: "Juan Demo Resident",
    purpose: "School enrollment",
    sitio: "Sitio Centro",
    years_of_residency: 12,
  },
};

describe("certificate request field requirements", () => {
  it("renders exactly the fields required by each certificate type", () => {
    const allFieldNames = [
      "full_name",
      "age",
      "sitio",
      "contact_number",
      "purpose",
      "place_of_birth",
      "birthdate",
      "years_of_residency",
    ];

    for (const certificateType of Object.keys(valuesFor) as CertificateType[]) {
      const expected = new Set(
        getCertificateFieldRequirements(certificateType).map(({ name }) => name),
      );
      const markup = renderToStaticMarkup(
        <CertificateRequestForm
          initialCertificateType={certificateType}
          mode="fully_online_demo"
          profile={profile}
        />,
      );

      for (const fieldName of allFieldNames) {
        const rendered = markup.includes(`name="${fieldName}"`);
        expect(rendered, `${certificateType} ${fieldName}`).toBe(
          expected.has(fieldName),
        );
      }
    }
  });

  it("accepts complete values for all four certificate types", () => {
    for (const values of Object.values(valuesFor)) {
      expect(certificateRequestSchema.safeParse(values).success).toBe(true);
    }
  });

  it("does not require Sitio for Barangay Certificate", () => {
    const result = certificateRequestSchema.safeParse(valuesFor.barangay_certificate);
    expect(result.success).toBe(true);
  });

  it("keeps Barangay Certificate information complete without Sitio", () => {
    const fields = getSubmittedInformation(requestBase);
    expect(fields).toEqual([
      { label: "Full name", value: "Juan Demo Resident" },
      { label: "Age", value: "28" },
      { label: "Contact number", value: "09170000001" },
      { label: "Place of birth", value: "Mauban, Quezon" },
      { label: "Purpose", value: "Scholarship requirement" },
    ]);
  });
});

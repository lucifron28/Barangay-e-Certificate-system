import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { CertificateType, ProfileRole } from "@/types/enums";

export type TursoQaAccount = {
  addressSitio: string;
  age: number;
  civilStatus: string;
  contactNumber: string;
  dateOfBirth: string;
  email: string;
  fullName: string;
  gender: string;
  id: string;
  occupation: string;
  role: ProfileRole;
  username: string;
};

export type TursoQaRequest = {
  certificateType: CertificateType;
  controlNumber: string | null;
  dateAccepted: string | null;
  dateRequested: string;
  feeAmount: number;
  id: string;
  paymentStatus: "unpaid" | "paid" | "free";
  purpose: string;
  remarks: string;
  requestNumber: string;
  residentId: string;
  status: "pending" | "accepted";
  submittedData: string;
};

export type TursoQaStatement = {
  args: (string | number | null)[];
  sql: string;
};

export function hashTursoSeedPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function getTursoQaAccounts(): TursoQaAccount[] {
  return [
    {
      addressSitio: "Barangay Hall",
      age: 35,
      civilStatus: "N/A",
      contactNumber: "09000000001",
      dateOfBirth: "1991-01-01",
      email: "admin@example.com",
      fullName: "Demo Main Admin",
      gender: "N/A",
      id: "00000000-0000-4000-8000-000000000001",
      occupation: "Main Admin",
      role: "main_admin",
      username: "mainadmin",
    },
    {
      addressSitio: "Barangay Hall",
      age: 34,
      civilStatus: "N/A",
      contactNumber: "09000000002",
      dateOfBirth: "1992-02-02",
      email: "secretary@example.com",
      fullName: "Demo Barangay Secretary",
      gender: "N/A",
      id: "00000000-0000-4000-8000-000000000002",
      occupation: "Barangay Secretary",
      role: "barangay_secretary",
      username: "secretary",
    },
    {
      addressSitio: "Sitio Centro",
      age: 28,
      civilStatus: "Single",
      contactNumber: "09170000001",
      dateOfBirth: "1998-03-12",
      email: "resident@example.com",
      fullName: "Juan Demo Resident",
      gender: "Male",
      id: "00000000-0000-4000-8000-000000000003",
      occupation: "Farmer",
      role: "resident",
      username: "juanresident",
    },
    {
      addressSitio: "Sitio Ilaya",
      age: 31,
      civilStatus: "Single",
      contactNumber: "09170000002",
      dateOfBirth: "1995-09-20",
      email: "maria.resident@example.com",
      fullName: "Maria Demo Resident",
      gender: "Female",
      id: "00000000-0000-4000-8000-000000000004",
      occupation: "Vendor",
      role: "resident",
      username: "mariaresident",
    },
  ];
}

export function getTursoQaRequests(
  year: number = new Date().getFullYear(),
  baseTime: Date = new Date(),
): TursoQaRequest[] {
  const baseMs = baseTime.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const pendingIndigencyDate = new Date(baseMs - 1 * dayMs).toISOString();
  const acceptedClearanceDate = new Date(baseMs - 2 * dayMs).toISOString();
  const acceptedResidencyDate = new Date(baseMs - 3 * dayMs).toISOString();
  const pendingCertificateDate = new Date(baseMs - 4 * dayMs).toISOString();

  return [
    {
      certificateType: "barangay_indigency",
      controlNumber: null,
      dateAccepted: null,
      dateRequested: pendingIndigencyDate,
      feeAmount: 0,
      id: "10000000-0000-4000-8000-000000009001",
      paymentStatus: "free",
      purpose: "Medical assistance",
      remarks: "Synthetic client QA request.",
      requestNumber: `REQ-${year}-9001`,
      residentId: "00000000-0000-4000-8000-000000000004",
      status: "pending",
      submittedData: JSON.stringify({
        certificate_specific: {
          birthdate: null,
          place_of_birth: null,
          years_of_residency: null,
        },
        common: {
          address_sitio: "Sitio Ilaya",
          age: 31,
          contact_number: "09170000002",
          full_name: "Maria Demo Resident",
          purpose: "Medical assistance",
        },
      }),
    },
    {
      certificateType: "barangay_clearance",
      controlNumber: `BCL-${year}-9001`,
      dateAccepted: acceptedClearanceDate,
      dateRequested: acceptedClearanceDate,
      feeAmount: 50,
      id: "10000000-0000-4000-8000-000000009002",
      paymentStatus: "paid",
      purpose: "Employment requirement",
      remarks: "Synthetic client QA request. Verified GCash payment.",
      requestNumber: `REQ-${year}-9002`,
      residentId: "00000000-0000-4000-8000-000000000003",
      status: "accepted",
      submittedData: JSON.stringify({
        certificate_specific: {
          birthdate: null,
          place_of_birth: null,
          years_of_residency: null,
        },
        common: {
          address_sitio: "Sitio Centro",
          age: 28,
          contact_number: "09170000001",
          full_name: "Juan Demo Resident",
          purpose: "Employment requirement",
        },
      }),
    },
    {
      certificateType: "barangay_residency",
      controlNumber: null,
      dateAccepted: acceptedResidencyDate,
      dateRequested: acceptedResidencyDate,
      feeAmount: 50,
      id: "10000000-0000-4000-8000-000000009003",
      paymentStatus: "unpaid",
      purpose: "School enrollment",
      remarks: "Synthetic client QA request.",
      requestNumber: `REQ-${year}-9003`,
      residentId: "00000000-0000-4000-8000-000000000004",
      status: "accepted",
      submittedData: JSON.stringify({
        certificate_specific: {
          birthdate: "1995-09-20",
          place_of_birth: null,
          years_of_residency: 12,
        },
        common: {
          address_sitio: "Sitio Ilaya",
          age: 31,
          contact_number: "09170000002",
          full_name: "Maria Demo Resident",
          purpose: "School enrollment",
        },
      }),
    },
    {
      certificateType: "barangay_certificate",
      controlNumber: null,
      dateAccepted: null,
      dateRequested: pendingCertificateDate,
      feeAmount: 50,
      id: "10000000-0000-4000-8000-000000009004",
      paymentStatus: "unpaid",
      purpose: "Scholarship requirement",
      remarks: "Synthetic client QA request.",
      requestNumber: `REQ-${year}-9004`,
      residentId: "00000000-0000-4000-8000-000000000003",
      status: "pending",
      submittedData: JSON.stringify({
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
      }),
    },
  ];
}

export function buildTursoQaAccountStatements(
  accounts: TursoQaAccount[],
  passwords: { admin: string; resident: string },
  timestamp: string = new Date().toISOString(),
): TursoQaStatement[] {
  return accounts.map((account) => ({
    sql: `
      INSERT INTO profiles (
        id, auth_user_id, full_name, age, address_sitio, date_of_birth,
        civil_status, contact_number, gender, occupation, email, username,
        password_hash, role, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        age = excluded.age,
        address_sitio = excluded.address_sitio,
        date_of_birth = excluded.date_of_birth,
        civil_status = excluded.civil_status,
        contact_number = excluded.contact_number,
        gender = excluded.gender,
        occupation = excluded.occupation,
        username = excluded.username,
        password_hash = excluded.password_hash,
        role = excluded.role,
        updated_at = excluded.updated_at
    `,
    args: [
      account.id,
      account.fullName,
      account.age,
      account.addressSitio,
      account.dateOfBirth,
      account.civilStatus,
      account.contactNumber,
      account.gender,
      account.occupation,
      account.email,
      account.username,
      hashTursoSeedPassword(
        account.role === "resident" ? passwords.resident : passwords.admin,
      ),
      account.role,
      timestamp,
      timestamp,
    ],
  }));
}

export function buildTursoQaRequestStatements(
  requests: TursoQaRequest[],
): TursoQaStatement[] {
  return requests.map((request) => ({
    sql: `
      INSERT INTO certificate_requests (
        id, request_number, resident_id, certificate_type, purpose, status,
        remarks, submitted_data, control_number, fee_amount, payment_status,
        date_requested, date_accepted, date_released, cancelled_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      ON CONFLICT(request_number) DO NOTHING
    `,
    args: [
      request.id,
      request.requestNumber,
      request.residentId,
      request.certificateType,
      request.purpose,
      request.status,
      request.remarks,
      request.submittedData,
      request.controlNumber,
      request.feeAmount,
      request.paymentStatus,
      request.dateRequested,
      request.dateAccepted,
      request.dateRequested,
      request.dateRequested,
    ],
  }));
}

export function buildTursoQaActivityStatements(
  requests: TursoQaRequest[],
): TursoQaStatement[] {
  return requests.map((request, index) => ({
    sql: `
      INSERT INTO activity_logs (
        id, user_id, role, action, affected_table, affected_record_id,
        remarks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `,
    args: [
      `20000000-0000-4000-8000-${String(9001 + index).padStart(12, "0")}`,
      request.status === "pending"
        ? request.residentId
        : "00000000-0000-4000-8000-000000000002",
      request.status === "pending" ? "resident" : "barangay_secretary",
      request.status === "pending" ? "Request submitted" : "Request accepted",
      "certificate_requests",
      request.id,
      "Synthetic client QA activity record.",
      request.dateRequested,
    ],
  }));
}

export function buildTursoQaPaymentStatements(
  requests: TursoQaRequest[],
  timestamp: string = new Date().toISOString(),
): TursoQaStatement[] {
  const paidFeeRequests = requests.filter((r) => r.paymentStatus === "paid" && r.feeAmount > 0);
  return paidFeeRequests.map((r, index) => ({
    sql: `
      INSERT INTO payments (
        id, request_id, resident_id, provider, provider_transaction_id, amount,
        currency, status, submitted_at, transaction_datetime, proof_storage_provider,
        proof_storage_key, proof_sha256, paid_at, reviewed_at, reviewed_by,
        review_remarks, created_at, updated_at
      ) VALUES (?, ?, ?, 'gcash', ?, ?, 'PHP', 'paid', ?, ?, 'local', ?, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', ?, ?, '00000000-0000-4000-8000-000000000002', 'Verified via GCash merchant ledger', ?, ?)
      ON CONFLICT(provider_transaction_id) DO NOTHING
    `,
    args: [
      `30000000-0000-4000-8000-${String(9001 + index).padStart(12, "0")}`,
      r.id,
      r.residentId,
      `GCASH-QA-${String(9001 + index)}`,
      r.feeAmount,
      r.dateAccepted ?? timestamp,
      r.dateAccepted ?? timestamp,
      `payment-proofs/qa-${String(9001 + index)}.png`,
      r.dateAccepted ?? timestamp,
      r.dateAccepted ?? timestamp,
      r.dateAccepted ?? timestamp,
      r.dateAccepted ?? timestamp,
    ],
  }));
}

export function buildTursoQaSystemSettingStatements(
  timestamp: string = new Date().toISOString(),
): TursoQaStatement[] {
  return [
    {
      sql: `
        INSERT INTO system_settings (id, key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO NOTHING
      `,
      args: [
        randomUUID(),
        "barangay_captain_name",
        "DIOGENES E. MANAOG",
        timestamp,
        timestamp,
      ],
    },
    {
      sql: `
        INSERT INTO system_settings (id, key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO NOTHING
      `,
      args: [
        randomUUID(),
        "payment_receiving_gcash",
        JSON.stringify({
          enabled: false,
          merchantName: "",
          qrStorageKey: null,
          qrStorageProvider: null,
          qrUpdatedAt: null,
        }),
        timestamp,
        timestamp,
      ],
    },
    {
      sql: `
        INSERT INTO system_settings (id, key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(key) DO NOTHING
      `,
      args: [
        randomUUID(),
        "payment_receiving_maya",
        JSON.stringify({
          enabled: false,
          merchantName: "",
          qrStorageKey: null,
          qrStorageProvider: null,
          qrUpdatedAt: null,
        }),
        timestamp,
        timestamp,
      ],
    },
  ];
}

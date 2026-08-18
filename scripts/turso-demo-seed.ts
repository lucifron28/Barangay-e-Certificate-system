import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { connect, type Connection } from "@tursodatabase/serverless";
import { assertStrongDemoPassword } from "@/lib/auth/demo-password-policy";

type DemoAccount = {
  id: string;
  fullName: string;
  age: number;
  addressSitio: string;
  dateOfBirth: string;
  civilStatus: string;
  contactNumber: string;
  gender: string;
  occupation: string;
  email: string;
  username: string;
  role: "resident" | "main_admin" | "barangay_secretary";
};

type DemoRequest = {
  id: string;
  requestNumber: string;
  residentId: string;
  certificateType:
    | "barangay_clearance"
    | "barangay_certificate"
    | "barangay_indigency"
    | "barangay_residency";
  purpose: string;
  status: "pending" | "accepted";
  remarks: string | null;
  submittedData: string;
  controlNumber: string | null;
  feeAmount: number;
  paymentStatus: "unpaid" | "paid" | "free";
  dateRequested: string;
  dateAccepted: string | null;
};

const confirmation = "--confirm-thesis-demo";
const currentYear = new Date().getFullYear();
const timestamp = new Date().toISOString();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

function dateOffset(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function connectToTurso() {
  if (process.argv[2] !== confirmation) {
    throw new Error(`Refusing to seed Turso without ${confirmation}.`);
  }

  if ((process.env.DATABASE_PROVIDER ?? "").trim().toLowerCase() !== "turso") {
    throw new Error("DATABASE_PROVIDER must be turso for the production demo seed.");
  }

  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  }

  return connect({ authToken, url });
}

function getAccounts(): DemoAccount[] {
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

function getRequests(): DemoRequest[] {
  const pendingDate = dateOffset(-1);
  const acceptedDate = dateOffset(-2);
  const freeDate = dateOffset(-3);

  return [
    {
      certificateType: "barangay_indigency",
      controlNumber: null,
      dateAccepted: null,
      dateRequested: pendingDate,
      feeAmount: 0,
      id: "10000000-0000-4000-8000-000000009001",
      paymentStatus: "free",
      purpose: "Medical assistance",
      remarks: "Synthetic thesis-demo request.",
      requestNumber: `REQ-${currentYear}-9001`,
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
      controlNumber: `BCL-${currentYear}-9001`,
      dateAccepted: acceptedDate,
      dateRequested: acceptedDate,
      feeAmount: 50,
      id: "10000000-0000-4000-8000-000000009002",
      paymentStatus: "paid",
      purpose: "Employment requirement",
      remarks: "Synthetic thesis-demo request. Payment is simulated.",
      requestNumber: `REQ-${currentYear}-9002`,
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
      dateAccepted: freeDate,
      dateRequested: freeDate,
      feeAmount: 50,
      id: "10000000-0000-4000-8000-000000009003",
      paymentStatus: "unpaid",
      purpose: "School enrollment",
      remarks: "Synthetic thesis-demo request.",
      requestNumber: `REQ-${currentYear}-9003`,
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
  ];
}

function accountStatements(
  accounts: DemoAccount[],
  passwords: { admin: string; resident: string },
) {
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
      hashPassword(
        account.role === "resident" ? passwords.resident : passwords.admin,
      ),
      account.role,
      timestamp,
      timestamp,
    ],
  }));
}

function requestStatements(requests: DemoRequest[]) {
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

function activityStatements(requests: DemoRequest[]) {
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
      "Synthetic thesis-demo activity record.",
      request.dateRequested,
    ],
  }));
}

async function main() {
  const db = connectToTurso() as Connection;
  const adminPassword = assertStrongDemoPassword(
    "DEMO_ADMIN_PASSWORD",
    process.env.DEMO_ADMIN_PASSWORD ?? "",
  );
  const residentPassword = assertStrongDemoPassword(
    "DEMO_RESIDENT_PASSWORD",
    process.env.DEMO_RESIDENT_PASSWORD ?? "",
  );
  const accounts = getAccounts();
  const requests = getRequests();

  await db.batch(
    [
      ...accountStatements(accounts, {
        admin: adminPassword,
        resident: residentPassword,
      }),
      {
        sql: `
          UPDATE auth_sessions
          SET revoked_at = ?
          WHERE profile_id IN (?, ?, ?, ?)
            AND revoked_at IS NULL
        `,
        args: [timestamp, ...accounts.map((account) => account.id)],
      },
      ...requestStatements(requests),
      ...activityStatements(requests),
      {
        sql: `
          INSERT INTO system_settings (id, key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(key) DO NOTHING
        `,
        args: [
          randomUUID(),
          "barangay_captain_name",
          "Authorized Barangay Official",
          timestamp,
          timestamp,
        ],
      },
    ],
    "immediate",
  );

  process.stdout.write(
    `Seeded ${accounts.length} synthetic Turso demo accounts and ${requests.length} synthetic requests.\n`,
  );
  process.stdout.write("Existing records were preserved; rerunning this command is idempotent.\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Turso demo seed failed."}\n`);
  process.exitCode = 1;
});

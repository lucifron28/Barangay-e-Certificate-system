import Database from "better-sqlite3";
import { Buffer } from "node:buffer";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const databaseUrl = process.env.SQLITE_DATABASE_URL ?? "file:./data/dev.sqlite";
const dbPath = path.resolve(
  root,
  databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl,
);
const reset = process.argv.includes("--reset");
const seedOnly = process.argv.includes("--seed-only");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function nowIso() {
  return new Date().toISOString();
}

function insertProfile(db, profile) {
  db.prepare(
    `INSERT OR IGNORE INTO profiles (
      id, auth_user_id, full_name, age, address_sitio, date_of_birth,
      civil_status, contact_number, gender, occupation, email, username,
      password_hash, role, created_at, updated_at
    ) VALUES (
      @id, NULL, @full_name, @age, @address_sitio, @date_of_birth,
      @civil_status, @contact_number, @gender, @occupation, @email, @username,
      @password_hash, @role, @created_at, @updated_at
    )`,
  ).run(profile);
}

function insertRequest(db, request) {
  db.prepare(
    `INSERT OR IGNORE INTO certificate_requests (
      id, request_number, resident_id, certificate_type, purpose, status,
      remarks, submitted_data, control_number, fee_amount, payment_status,
      date_requested, date_accepted, date_released, cancelled_at, created_at, updated_at
    ) VALUES (
      @id, @request_number, @resident_id, @certificate_type, @purpose, @status,
      @remarks, @submitted_data, @control_number, @fee_amount, @payment_status,
      @date_requested, @date_accepted, @date_released, @cancelled_at, @created_at, @updated_at
    )`,
  ).run(request);
}

if (reset) {
  for (const suffix of ["", "-shm", "-wal"]) {
    const target = `${dbPath}${suffix}`;
    if (existsSync(target)) {
      unlinkSync(target);
    }
  }
}

mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

if (!seedOnly) {
  const schemaPath = path.join(root, "lib", "db", "sqlite", "schema.sql");
  db.exec(readFileSync(schemaPath, "utf8"));
}

const timestamp = nowIso();
const password = process.env.LOCAL_DEMO_ADMIN_PASSWORD ?? "password123";

const admin = {
  address_sitio: "Barangay Hall",
  age: 35,
  civil_status: "N/A",
  contact_number: "09000000001",
  created_at: timestamp,
  date_of_birth: "1991-01-01",
  email: process.env.LOCAL_DEMO_ADMIN_EMAIL ?? "admin@example.com",
  full_name: "Demo Main Admin",
  gender: "N/A",
  id: "00000000-0000-4000-8000-000000000001",
  occupation: "Main Admin",
  password_hash: hashPassword(password),
  role: "main_admin",
  updated_at: timestamp,
  username: "mainadmin",
};

const secretary = {
  ...admin,
  contact_number: "09000000002",
  email: "secretary@example.com",
  full_name: "Demo Barangay Secretary",
  id: "00000000-0000-4000-8000-000000000002",
  occupation: "Barangay Secretary",
  role: "barangay_secretary",
  username: "secretary",
};

const resident = {
  ...admin,
  address_sitio: "Sitio Centro",
  age: 28,
  civil_status: "Single",
  contact_number: "09170000001",
  date_of_birth: "1998-03-12",
  email: "resident@example.com",
  full_name: "Juan Demo Resident",
  gender: "Male",
  id: "00000000-0000-4000-8000-000000000003",
  occupation: "Farmer",
  role: "resident",
  username: "juanresident",
};

const residentTwo = {
  ...resident,
  address_sitio: "Sitio Ilaya",
  age: 31,
  contact_number: "09170000002",
  date_of_birth: "1995-09-20",
  email: "maria.resident@example.com",
  full_name: "Maria Demo Resident",
  gender: "Female",
  id: "00000000-0000-4000-8000-000000000004",
  occupation: "Vendor",
  username: "mariaresident",
};

db.transaction(() => {
  for (const profile of [admin, secretary, resident, residentTwo]) {
    insertProfile(db, profile);
  }

  insertRequest(db, {
    cancelled_at: null,
    certificate_type: "barangay_clearance",
    control_number: "BCL-2026-0001",
    created_at: timestamp,
    date_accepted: timestamp,
    date_released: null,
    date_requested: timestamp,
    fee_amount: 50,
    id: "10000000-0000-4000-8000-000000000001",
    payment_status: "unpaid",
    purpose: "Employment requirement",
    remarks: "Accepted for demo processing.",
    request_number: "REQ-2026-0001",
    resident_id: resident.id,
    status: "ready_for_pickup",
    submitted_data: JSON.stringify({
      certificate_specific: {},
      common: {
        address_sitio: resident.address_sitio,
        age: resident.age,
        contact_number: resident.contact_number,
        full_name: resident.full_name,
        purpose: "Employment requirement",
      },
    }),
    updated_at: timestamp,
  });

  insertRequest(db, {
    cancelled_at: null,
    certificate_type: "barangay_indigency",
    control_number: null,
    created_at: timestamp,
    date_accepted: null,
    date_released: null,
    date_requested: timestamp,
    fee_amount: 0,
    id: "10000000-0000-4000-8000-000000000002",
    payment_status: "free",
    purpose: "Medical assistance",
    remarks: null,
    request_number: "REQ-2026-0002",
    resident_id: residentTwo.id,
    status: "pending",
    submitted_data: JSON.stringify({
      certificate_specific: {},
      common: {
        address_sitio: residentTwo.address_sitio,
        age: residentTwo.age,
        contact_number: residentTwo.contact_number,
        full_name: residentTwo.full_name,
        purpose: "Medical assistance",
      },
    }),
    updated_at: timestamp,
  });

  db.prepare(
    `INSERT OR IGNORE INTO pickup_schedules (
      id, request_id, pickup_date, pickup_time, remarks, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "20000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000001",
    "2026-05-15",
    "09:00",
    "Bring a valid ID.",
    secretary.id,
    timestamp,
    timestamp,
  );

  db.prepare(
    `INSERT OR IGNORE INTO activity_logs (
      id, user_id, role, action, affected_table, affected_record_id, remarks, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "30000000-0000-4000-8000-000000000001",
    secretary.id,
    secretary.role,
    "Created pickup schedule",
    "pickup_schedules",
    "20000000-0000-4000-8000-000000000001",
    "Seeded demo activity.",
    timestamp,
  );

  const settings = [
    ["barangay_captain_name", "Barangay Captain Name"],
    ["signature_image_path", null],
    ["office_hours", "Monday to Friday, 8:00 AM to 5:00 PM"],
  ];

  for (const [key, value] of settings) {
    db.prepare(
      `INSERT OR IGNORE INTO system_settings (
        id, key, value, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      cryptoRandomId(key),
      key,
      JSON.stringify(value),
      timestamp,
      timestamp,
    );
  }
})();

db.close();
process.stdout.write(`SQLite database is ready at ${dbPath}\n`);

function cryptoRandomId(key) {
  const suffix = Buffer.from(key).toString("hex").slice(0, 12).padEnd(12, "0");
  return `40000000-0000-4000-8000-${suffix}`;
}

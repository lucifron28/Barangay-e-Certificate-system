import Database from "better-sqlite3";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import {
  createCertificateDownloadLog,
  getRequestById,
  revokeCertificateRecord,
  setSystemSetting,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";
import { issueCertificate } from "@/lib/services/certificate-issuance";
import type { Json, Profile } from "@/types/database";

const root = process.cwd();
const databaseUrl = process.env.SQLITE_DATABASE_URL ?? "file:./data/dev.sqlite";
const dbPath = path.resolve(
  root,
  databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl,
);
const password = process.env.LOCAL_DEMO_ADMIN_PASSWORD ?? "password123";
const year = new Date().getFullYear();

function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(value, salt, 64).toString("hex")}`;
}

function dateOffset(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function insertProfile(db: Database.Database, profile: Profile) {
  db.prepare(
    `INSERT INTO profiles (
      id, auth_user_id, full_name, age, address_sitio, date_of_birth,
      civil_status, contact_number, gender, occupation, email, username,
      password_hash, role, created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    profile.id,
    profile.full_name,
    profile.age,
    profile.address_sitio,
    profile.date_of_birth,
    profile.civil_status,
    profile.contact_number,
    profile.gender,
    profile.occupation,
    profile.email,
    profile.username,
    profile.password_hash,
    profile.role,
    profile.created_at,
    profile.updated_at,
  );
}

function insertRequest(
  db: Database.Database,
  request: {
    id: string;
    requestNumber: string;
    residentId: string;
    certificateType: string;
    purpose: string;
    status: string;
    remarks?: string | null;
    submittedData: Json;
    controlNumber?: string | null;
    feeAmount: number;
    paymentStatus: string;
    dateRequested: string;
    dateAccepted?: string | null;
  },
) {
  db.prepare(
    `INSERT INTO certificate_requests (
      id, request_number, resident_id, certificate_type, purpose, status,
      remarks, submitted_data, control_number, fee_amount, payment_status,
      date_requested, date_accepted, date_released, cancelled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
  ).run(
    request.id,
    request.requestNumber,
    request.residentId,
    request.certificateType,
    request.purpose,
    request.status,
    request.remarks ?? null,
    JSON.stringify(request.submittedData),
    request.controlNumber ?? null,
    request.feeAmount,
    request.paymentStatus,
    request.dateRequested,
    request.dateAccepted ?? null,
    request.dateRequested,
    request.dateRequested,
  );
}

function insertPayment(
  db: Database.Database,
  input: {
    id: string;
    requestId: string;
    residentId: string;
    amount: number;
    status: string;
    createdAt: string;
    expiresAt?: string | null;
    paidAt?: string | null;
    transactionId: string;
  },
) {
  db.prepare(
    `INSERT INTO payments (
      id, request_id, resident_id, provider, provider_transaction_id, amount,
      currency, status, paid_at, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'mock_thesis_demo', ?, ?, 'PHP', ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.requestId,
    input.residentId,
    input.transactionId,
    input.amount,
    input.status,
    input.paidAt ?? null,
    input.expiresAt ?? null,
    input.createdAt,
    input.createdAt,
  );
}

function insertPaymentEvent(db: Database.Database, paymentId: string, eventType: string, createdAt: string) {
  db.prepare(
    "INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), paymentId, eventType, JSON.stringify({ simulated: true }), createdAt);
}

function insertActivity(db: Database.Database, input: { action: string; recordId: string; remarks: string; userId: string; role: string; createdAt: string }) {
  db.prepare(
    `INSERT INTO activity_logs (
      id, user_id, role, action, affected_table, affected_record_id, remarks, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), input.userId, input.role, input.action, "certificate_requests", input.recordId, input.remarks, input.createdAt);
}

function submittedData(input: {
  name: string;
  age: number;
  contact: string;
  purpose: string;
  sitio?: string;
  placeOfBirth?: string;
  birthdate?: string;
  yearsOfResidency?: number;
}): Json {
  return {
    certificate_specific: {
      birthdate: input.birthdate ?? null,
      place_of_birth: input.placeOfBirth ?? null,
      years_of_residency: input.yearsOfResidency ?? null,
    },
    common: {
      address_sitio: input.sitio ?? null,
      age: input.age,
      contact_number: input.contact,
      full_name: input.name,
      purpose: input.purpose,
    },
  };
}

function clearDatabaseFiles() {
  for (const suffix of ["", "-shm", "-wal"]) {
    const target = `${dbPath}${suffix}`;
    if (existsSync(target)) rmSync(target, { force: true });
  }
  const certificateDirectory = process.env.CERTIFICATE_STORAGE_DIRECTORY
    ? path.resolve(root, process.env.CERTIFICATE_STORAGE_DIRECTORY)
    : path.join(root, "data", "certificates");
  if (existsSync(certificateDirectory)) rmSync(certificateDirectory, { force: true, recursive: true });
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

async function main() {
  clearDatabaseFiles();
  const db = getSqliteDb();
  const timestamp = new Date().toISOString();
  const adminId = "00000000-0000-4000-8000-000000000001";
  const secretaryId = "00000000-0000-4000-8000-000000000002";
  const residentId = "00000000-0000-4000-8000-000000000003";
  const residentTwoId = "00000000-0000-4000-8000-000000000004";

  const admin = {
    address_sitio: "Barangay Hall",
    age: 35,
    auth_user_id: null,
    civil_status: "N/A",
    contact_number: "09000000001",
    created_at: timestamp,
    date_of_birth: "1991-01-01",
    email: process.env.LOCAL_DEMO_ADMIN_EMAIL ?? "admin@example.com",
    full_name: "Demo Main Admin",
    gender: "N/A",
    id: adminId,
    occupation: "Main Admin",
    password_hash: hashPassword(password),
    role: "main_admin" as const,
    updated_at: timestamp,
    username: "mainadmin",
  } satisfies Profile;
  const secretary = { ...admin, email: "secretary@example.com", full_name: "Demo Barangay Secretary", id: secretaryId, occupation: "Barangay Secretary", role: "barangay_secretary" as const, username: "secretary", contact_number: "09000000002" } satisfies Profile;
  const resident = { ...admin, address_sitio: "Sitio Centro", age: 28, civil_status: "Single", contact_number: "09170000001", date_of_birth: "1998-03-12", email: "resident@example.com", full_name: "Juan Demo Resident", gender: "Male", id: residentId, occupation: "Farmer", role: "resident" as const, username: "juanresident" } satisfies Profile;
  const residentTwo = { ...resident, address_sitio: "Sitio Ilaya", age: 31, contact_number: "09170000002", date_of_birth: "1995-09-20", email: "maria.resident@example.com", full_name: "María De León", gender: "Female", id: residentTwoId, occupation: "Vendor", username: "mariaresident" } satisfies Profile;

  const requestIds = Array.from({ length: 7 }, (_, index) => `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
  const dates = [dateOffset(-1), dateOffset(-2), dateOffset(-3), dateOffset(-4), dateOffset(-5), dateOffset(-6), dateOffset(-7)];

  db.transaction(() => {
    for (const profile of [admin, secretary, resident, residentTwo]) insertProfile(db, profile);

    insertRequest(db, { id: requestIds[0], requestNumber: `REQ-${year}-0001`, residentId: residentTwoId, certificateType: "barangay_certificate", purpose: "Scholarship requirement", status: "pending", submittedData: submittedData({ name: residentTwo.full_name, age: residentTwo.age, contact: residentTwo.contact_number, purpose: "Scholarship requirement", placeOfBirth: "Mauban, Quezon" }), feeAmount: 50, paymentStatus: "unpaid", dateRequested: dates[0] });
    insertRequest(db, { id: requestIds[1], requestNumber: `REQ-${year}-0002`, residentId: residentId, certificateType: "barangay_clearance", purpose: "Employment requirement", status: "accepted", remarks: "Accepted and awaiting demo payment.", submittedData: submittedData({ name: resident.full_name, age: resident.age, contact: resident.contact_number, purpose: "Employment requirement", sitio: resident.address_sitio }), controlNumber: `BCL-${year}-0001`, feeAmount: 50, paymentStatus: "unpaid", dateRequested: dates[1], dateAccepted: dates[1] });
    insertRequest(db, { id: requestIds[2], requestNumber: `REQ-${year}-0003`, residentId: residentId, certificateType: "barangay_certificate", purpose: "Local employment", status: "accepted", submittedData: submittedData({ name: resident.full_name, age: resident.age, contact: resident.contact_number, purpose: "Local employment", placeOfBirth: "Mauban, Quezon" }), feeAmount: 50, paymentStatus: "paid", dateRequested: dates[2], dateAccepted: dates[2] });
    insertRequest(db, { id: requestIds[3], requestNumber: `REQ-${year}-0004`, residentId: residentTwoId, certificateType: "barangay_indigency", purpose: "Medical assistance", status: "accepted", submittedData: submittedData({ name: residentTwo.full_name, age: residentTwo.age, contact: residentTwo.contact_number, purpose: "Medical assistance", sitio: residentTwo.address_sitio }), feeAmount: 0, paymentStatus: "free", dateRequested: dates[3], dateAccepted: dates[3] });
    insertRequest(db, { id: requestIds[4], requestNumber: `REQ-${year}-0005`, residentId: residentId, certificateType: "barangay_residency", purpose: "School enrollment", status: "accepted", submittedData: submittedData({ name: resident.full_name, age: resident.age, contact: resident.contact_number, purpose: "School enrollment", sitio: resident.address_sitio, birthdate: resident.date_of_birth ?? undefined, yearsOfResidency: 12 }), feeAmount: 50, paymentStatus: "paid", dateRequested: dates[4], dateAccepted: dates[4] });
    insertRequest(db, { id: requestIds[5], requestNumber: `REQ-${year}-0006`, residentId: residentTwoId, certificateType: "barangay_clearance", purpose: "Loan application", status: "accepted", submittedData: submittedData({ name: residentTwo.full_name, age: residentTwo.age, contact: residentTwo.contact_number, purpose: "Loan application", sitio: residentTwo.address_sitio }), controlNumber: `BCL-${year}-0002`, feeAmount: 50, paymentStatus: "paid", dateRequested: dates[5], dateAccepted: dates[5] });
    insertRequest(db, { id: requestIds[6], requestNumber: `REQ-${year}-0007`, residentId: residentId, certificateType: "barangay_indigency", purpose: "Educational support", status: "accepted", submittedData: submittedData({ name: resident.full_name, age: resident.age, contact: resident.contact_number, purpose: "Educational support", sitio: resident.address_sitio }), feeAmount: 0, paymentStatus: "free", dateRequested: dates[6], dateAccepted: dates[6] });

    db.prepare("INSERT INTO document_counters (id, counter_type, year, current_value, created_at, updated_at) VALUES (?, 'request_number', ?, 7, ?, ?)").run(randomUUID(), year, timestamp, timestamp);
    db.prepare("INSERT INTO document_counters (id, counter_type, year, current_value, created_at, updated_at) VALUES (?, 'barangay_clearance_control_number', ?, 2, ?, ?)").run(randomUUID(), year, timestamp, timestamp);

    const failedPaymentId = randomUUID();
    insertPayment(db, { id: failedPaymentId, requestId: requestIds[1], residentId, amount: 50, status: "failed", transactionId: `DEMO-PAY-${year}-FAILED1`, createdAt: dateOffset(-1) });
    insertPaymentEvent(db, failedPaymentId, "mock_payment_failed", dateOffset(-1));
    const cancelledPaymentId = randomUUID();
    insertPayment(db, { id: cancelledPaymentId, requestId: requestIds[1], residentId, amount: 50, status: "cancelled", transactionId: `DEMO-PAY-${year}-CANCEL1`, createdAt: dateOffset(-1) });
    insertPaymentEvent(db, cancelledPaymentId, "mock_payment_cancelled", dateOffset(-1));
    const pendingPaymentId = randomUUID();
    insertPayment(db, { id: pendingPaymentId, requestId: requestIds[1], residentId, amount: 50, status: "pending", transactionId: `DEMO-PAY-${year}-PENDING1`, createdAt: timestamp, expiresAt: dateOffset(1) });
    insertPaymentEvent(db, pendingPaymentId, "payment_initiated", timestamp);

    const successfulPaymentId = randomUUID();
    insertPayment(db, { id: successfulPaymentId, requestId: requestIds[2], residentId, amount: 50, status: "paid", transactionId: `DEMO-PAY-${year}-SUCCESS1`, createdAt: dateOffset(-3), paidAt: dateOffset(-3) });
    insertPaymentEvent(db, successfulPaymentId, "mock_payment_paid", dateOffset(-3));
    const oldFailedPaymentId = randomUUID();
    insertPayment(db, { id: oldFailedPaymentId, requestId: requestIds[2], residentId, amount: 50, status: "failed", transactionId: `DEMO-PAY-${year}-FAILED2`, createdAt: dateOffset(-4) });
    insertPaymentEvent(db, oldFailedPaymentId, "mock_payment_failed", dateOffset(-4));

    for (const [index, requestId] of [requestIds[4], requestIds[5]].entries()) {
      const paymentId = randomUUID();
      insertPayment(db, { id: paymentId, requestId, residentId: requestId === requestIds[5] ? residentTwoId : residentId, amount: 50, status: "paid", transactionId: `DEMO-PAY-${year}-ISSUED${index + 1}`, createdAt: dateOffset(-5 - index), paidAt: dateOffset(-5 - index) });
      insertPaymentEvent(db, paymentId, "mock_payment_paid", dateOffset(-5 - index));
    }

    insertActivity(db, { action: "Request submitted", recordId: requestIds[0], remarks: "Seeded presentation request.", userId: residentTwoId, role: "resident", createdAt: dates[0] });
    insertActivity(db, { action: "Request accepted", recordId: requestIds[2], remarks: "Seeded accepted paid request.", userId: secretaryId, role: "barangay_secretary", createdAt: dates[2] });
    insertActivity(db, { action: "Mock payment paid", recordId: requestIds[2], remarks: "DEMO PAYMENT - no actual funds transferred.", userId: residentId, role: "resident", createdAt: dateOffset(-3) });
    insertActivity(db, { action: "Request rejected", recordId: requestIds[0], remarks: "Seeded prior review history.", userId: secretaryId, role: "barangay_secretary", createdAt: dates[0] });

    for (const [key, value] of [["barangay_captain_name", "Authorized Barangay Official"], ["office_hours", "Monday to Friday, 8:00 AM to 5:00 PM"]]) {
      setSystemSetting(key, value);
    }
  })();

  const settings = { barangayCaptainName: "Authorized Barangay Official" };
  const issuedSamples: Array<{ label: string; token: string; certificateNumber: string }> = [];
  const issueSample = async (
    requestId: string,
    label: string,
    issueDate: string,
    preparedBy: Profile,
    now: Date,
  ) => {
    const request = getRequestById(requestId);
    if (!request) throw new Error(`Missing seed request ${requestId}`);
    const result = await issueCertificate({ dateIssued: issueDate, now, preparedBy: preparedBy.full_name, preparedById: preparedBy.id, request, settings });
    issuedSamples.push({ label, token: result.verificationToken, certificateNumber: result.certificateNumber });
    return result;
  };

  const valid = await issueSample(requestIds[4], "VALID", dateOnly(dateOffset(-1)), admin, new Date(Date.now() - 24 * 60 * 60 * 1000));
  createCertificateDownloadLog(valid.certificateRecord.id, residentId, "downloaded");
  updateRequestStatus({ id: requestIds[4], status: "done", dateReleased: timestamp });
  insertActivity(db, { action: "Certificate issued", recordId: requestIds[4], remarks: `Seeded ${valid.certificateNumber}.`, userId: adminId, role: "main_admin", createdAt: timestamp });
  insertActivity(db, { action: "Certificate downloaded", recordId: requestIds[4], remarks: "Seeded successful resident download.", userId: residentId, role: "resident", createdAt: timestamp });

  const expired = await issueSample(requestIds[5], "EXPIRED", dateOnly(dateOffset(-10)), secretary, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
  updateRequestStatus({ id: requestIds[5], status: "done", dateReleased: timestamp });
  insertActivity(db, { action: "Certificate issued", recordId: requestIds[5], remarks: `Seeded expired verification ${expired.certificateNumber}.`, userId: secretaryId, role: "barangay_secretary", createdAt: timestamp });

  const revoked = await issueSample(requestIds[6], "REVOKED", dateOnly(dateOffset(-2)), admin, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
  revokeCertificateRecord({ id: revoked.certificateRecord.id, reason: "Seeded replacement demonstration.", revokedBy: adminId });
  updateRequestStatus({ id: requestIds[6], status: "done", dateReleased: timestamp });
  insertActivity(db, { action: "Certificate revoked", recordId: requestIds[6], remarks: "Seeded revoked verification.", userId: adminId, role: "main_admin", createdAt: timestamp });

  const notificationMessage = "Demo notification: no email provider is configured.";
  db.prepare(
    `INSERT INTO notification_logs (id, request_id, recipient_email, subject, message, status, provider_response, created_at)
     VALUES (?, ?, ?, ?, ?, 'skipped', ?, ?)`,
  ).run(randomUUID(), requestIds[2], resident.email, "Certificate Request Accepted", notificationMessage, JSON.stringify({ configured: false }), timestamp);

  db.prepare("UPDATE rate_limit_attempts SET attempts = 0").run();
  process.stdout.write(`SQLite thesis demo reset complete at ${dbPath}\n`);
  process.stdout.write(`Demo password: ${password}\n`);
  for (const sample of issuedSamples) {
    process.stdout.write(`${sample.label}: ${sample.certificateNumber} ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify/${sample.token}\n`);
  }
  if (process.env.DEMO_VERIFICATION_SAMPLES_PATH) {
    const samplesPath = path.resolve(root, process.env.DEMO_VERIFICATION_SAMPLES_PATH);
    mkdirSync(path.dirname(samplesPath), { recursive: true });
    writeFileSync(samplesPath, JSON.stringify(issuedSamples, null, 2));
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Demo reset failed."}\n`);
  process.exitCode = 1;
});

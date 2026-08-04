import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getSqliteDb } from "@/lib/db/sqlite/client";
import {
  getCertificateFee,
  getDefaultPaymentStatus,
} from "@/lib/services/business-rules";
import type {
  CertificateRecord,
  CertificateRequest,
  Json,
  Payment,
  PickupSchedule,
  Profile,
  SystemSetting,
} from "@/types/database";
import type {
  CertificateType,
  PaymentStatus,
  MockPaymentStatus,
  ProfileRole,
  RequestStatus,
} from "@/types/enums";

export type RequestWithResident = CertificateRequest & {
  pickup_schedules: PickupSchedule[];
  resident: Profile | null;
};

export type ScheduleWithRequest = PickupSchedule & {
  request: RequestWithResident | null;
};

export type ActivityLogWithUser = {
  action: string;
  affected_record_id: string | null;
  affected_table: string | null;
  created_at: string;
  id: string;
  remarks: string | null;
  role: string;
  user: Pick<Profile, "full_name" | "email"> | null;
  user_id: string | null;
};

export type SystemSettings = {
  barangayCaptainName: string;
  signatureImagePath: string | null;
};

type Row = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value: unknown): Json {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value) as Json;
  } catch {
    return null;
  }
}

function stringifyJson(value: Json) {
  return JSON.stringify(value);
}

function asText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function profileFromRow(row: Row | undefined): Profile | null {
  if (!row) {
    return null;
  }

  return {
    address_sitio: asText(row.address_sitio),
    age: row.age === null || row.age === undefined ? null : asNumber(row.age),
    auth_user_id: asText(row.auth_user_id),
    civil_status: asText(row.civil_status),
    contact_number: asText(row.contact_number),
    created_at: String(row.created_at),
    date_of_birth: asText(row.date_of_birth),
    email: String(row.email),
    full_name: String(row.full_name),
    gender: asText(row.gender),
    id: String(row.id),
    occupation: asText(row.occupation),
    password_hash: asText(row.password_hash),
    role: String(row.role) as ProfileRole,
    updated_at: String(row.updated_at),
    username: asText(row.username),
  };
}

function requestFromRow(row: Row | undefined): CertificateRequest | null {
  if (!row) {
    return null;
  }

  return {
    cancelled_at: asText(row.cancelled_at),
    certificate_type: String(row.certificate_type) as CertificateType,
    control_number: asText(row.control_number),
    created_at: String(row.created_at),
    date_accepted: asText(row.date_accepted),
    date_released: asText(row.date_released),
    date_requested: String(row.date_requested),
    fee_amount: asNumber(row.fee_amount),
    id: String(row.id),
    payment_status: String(row.payment_status) as PaymentStatus,
    purpose: String(row.purpose),
    remarks: asText(row.remarks),
    request_number: String(row.request_number),
    resident_id: String(row.resident_id),
    status: String(row.status) as RequestStatus,
    submitted_data: parseJson(row.submitted_data),
    updated_at: String(row.updated_at),
  };
}

function scheduleFromRow(row: Row | undefined): PickupSchedule | null {
  if (!row) {
    return null;
  }

  return {
    created_at: String(row.created_at),
    created_by: asText(row.created_by),
    id: String(row.id),
    pickup_date: String(row.pickup_date),
    pickup_time: String(row.pickup_time),
    remarks: asText(row.remarks),
    request_id: String(row.request_id),
    updated_at: String(row.updated_at),
  };
}

function certificateRecordFromRow(row: Row | undefined): CertificateRecord | null {
  if (!row) {
    return null;
  }

  return {
    certificate_number: asText(row.certificate_number),
    certificate_snapshot: parseJson(row.certificate_snapshot),
    certificate_type: String(row.certificate_type) as CertificateType,
    control_number: asText(row.control_number),
    created_at: String(row.created_at),
    date_issued: String(row.date_issued),
    id: String(row.id),
    pdf_path: asText(row.pdf_path),
    pdf_sha256: asText(row.pdf_sha256),
    prepared_by: asText(row.prepared_by),
    issuance_mode: String(row.issuance_mode) as CertificateRecord["issuance_mode"],
    issued_at: asText(row.issued_at),
    issued_by: asText(row.issued_by),
    request_id: String(row.request_id),
    replacement_record_id: asText(row.replacement_record_id),
    revocation_reason: asText(row.revocation_reason),
    revoked_at: asText(row.revoked_at),
    revoked_by: asText(row.revoked_by),
    resident_id: String(row.resident_id),
    template_data: parseJson(row.template_data),
    status: String(row.status) as CertificateRecord["status"],
    verification_expires_at: asText(row.verification_expires_at),
  };
}

function paymentFromRow(row: Row | undefined): Payment | null {
  if (!row) return null;
  return {
    amount: asNumber(row.amount),
    created_at: String(row.created_at),
    currency: String(row.currency),
    expires_at: asText(row.expires_at),
    id: String(row.id),
    paid_at: asText(row.paid_at),
    provider: String(row.provider),
    provider_transaction_id: String(row.provider_transaction_id),
    request_id: String(row.request_id),
    resident_id: String(row.resident_id),
    status: String(row.status) as MockPaymentStatus,
    updated_at: String(row.updated_at),
  };
}

function getSchedulesForRequest(requestId: string) {
  return getSqliteDb()
    .prepare("SELECT * FROM pickup_schedules WHERE request_id = ? ORDER BY pickup_date ASC")
    .all(requestId)
    .map((row) => scheduleFromRow(row as Row))
    .filter((row): row is PickupSchedule => Boolean(row));
}

function getResidentForRequest(request: CertificateRequest) {
  return getProfileById(request.resident_id);
}

function withRelations(request: CertificateRequest): RequestWithResident {
  return {
    ...request,
    pickup_schedules: getSchedulesForRequest(request.id),
    resident: getResidentForRequest(request),
  };
}

export function getProfileById(id: string) {
  return profileFromRow(
    getSqliteDb().prepare("SELECT * FROM profiles WHERE id = ?").get(id) as
      | Row
      | undefined,
  );
}

export function findProfileByLogin(login: string) {
  const normalized = login.trim().toLowerCase();
  return profileFromRow(
    getSqliteDb()
      .prepare(
        "SELECT * FROM profiles WHERE lower(email) = ? OR lower(username) = ? LIMIT 1",
      )
      .get(normalized, normalized) as Row | undefined,
  );
}

export function profileExists(email: string, username?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username?.trim().toLowerCase() || null;
  const row = getSqliteDb()
    .prepare(
      "SELECT id FROM profiles WHERE lower(email) = ? OR (? IS NOT NULL AND lower(username) = ?) LIMIT 1",
    )
    .get(normalizedEmail, normalizedUsername, normalizedUsername);

  return Boolean(row);
}

export function createProfile(input: {
  address_sitio: string;
  age: number;
  civil_status?: string | null;
  contact_number: string;
  date_of_birth?: string | null;
  email: string;
  full_name: string;
  gender?: string | null;
  occupation?: string | null;
  password_hash: string;
  role?: ProfileRole;
  username?: string | null;
}) {
  const id = randomUUID();
  const timestamp = nowIso();

  getSqliteDb()
    .prepare(
      `INSERT INTO profiles (
        id, auth_user_id, full_name, age, address_sitio, date_of_birth,
        civil_status, contact_number, gender, occupation, email, username,
        password_hash, role, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.full_name,
      input.age,
      input.address_sitio,
      input.date_of_birth || null,
      input.civil_status || null,
      input.contact_number,
      input.gender || null,
      input.occupation || null,
      input.email.trim().toLowerCase(),
      input.username?.trim() || null,
      input.password_hash,
      input.role ?? "resident",
      timestamp,
      timestamp,
    );

  const profile = getProfileById(id);
  if (!profile) {
    throw new Error("Created profile could not be loaded.");
  }

  return profile;
}

export function updateProfile(
  id: string,
  input: {
    address_sitio: string;
    age?: number | null;
    civil_status?: string | null;
    contact_number: string;
    date_of_birth?: string | null;
    full_name: string;
    gender?: string | null;
    occupation?: string | null;
    username?: string | null;
  },
) {
  getSqliteDb()
    .prepare(
      `UPDATE profiles
       SET full_name = ?, age = ?, address_sitio = ?, date_of_birth = ?,
           civil_status = ?, contact_number = ?, gender = ?, occupation = ?,
           username = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.full_name,
      input.age ?? null,
      input.address_sitio,
      input.date_of_birth || null,
      input.civil_status || null,
      input.contact_number,
      input.gender || null,
      input.occupation || null,
      input.username?.trim() || null,
      nowIso(),
      id,
    );

  return getProfileById(id);
}

function nextDocumentCounter(
  counterType: "request_number" | "barangay_clearance_control_number" | "certificate_number",
) {
  const year = new Date().getFullYear();
  const timestamp = nowIso();
  const row = getSqliteDb()
    .prepare(
      `INSERT INTO document_counters (id, counter_type, year, current_value, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(counter_type, year) DO UPDATE SET
         current_value = document_counters.current_value + 1,
         updated_at = excluded.updated_at
       RETURNING current_value`,
    )
    .get(randomUUID(), counterType, year, timestamp, timestamp) as { current_value: number };

  return { value: row.current_value, year };
}

export function generateRequestNumber() {
  const counter = nextDocumentCounter("request_number");
  return `REQ-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export function generateClearanceControlNumber() {
  const counter = nextDocumentCounter("barangay_clearance_control_number");
  return `BCL-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export function generateCertificateNumber() {
  const counter = nextDocumentCounter("certificate_number");
  return `CERT-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export function createCertificateRequest(input: {
  age: number;
  birthdate?: string | null;
  certificate_type: CertificateType;
  contact_number: string;
  full_name: string;
  place_of_birth?: string | null;
  purpose: string;
  resident_id: string;
  sitio: string;
  years_of_residency?: number | null;
}) {
  const id = randomUUID();
  const timestamp = nowIso();
  const feeAmount = getCertificateFee(input.certificate_type);
  const paymentStatus = getDefaultPaymentStatus(input.certificate_type);
  const dateRequested = timestamp;
  const submittedData: Json = {
    certificate_specific: {
      birthdate: input.birthdate || null,
      place_of_birth: input.place_of_birth || null,
      years_of_residency: input.years_of_residency ?? null,
    },
    common: {
      address_sitio: input.sitio,
      age: input.age,
      contact_number: input.contact_number,
      date_requested: dateRequested,
      full_name: input.full_name,
      purpose: input.purpose,
    },
    placeholders: [
      // TODO: Final production certificate field placement still needs client sign-off.
      "TODO: Exact final certificate template positioning is pending client confirmation.",
    ],
  };

  getSqliteDb().transaction(() => {
    const requestNumber = generateRequestNumber();
    const controlNumber =
      input.certificate_type === "barangay_clearance"
        ? generateClearanceControlNumber()
        : null;

    getSqliteDb()
      .prepare(
      `INSERT INTO certificate_requests (
        id, request_number, resident_id, certificate_type, purpose, status,
        remarks, submitted_data, control_number, fee_amount, payment_status,
        date_requested, date_accepted, date_released, cancelled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
      )
      .run(
      id,
      requestNumber,
      input.resident_id,
      input.certificate_type,
      input.purpose,
      stringifyJson(submittedData),
      controlNumber,
      feeAmount,
      paymentStatus,
      dateRequested,
      timestamp,
        timestamp,
      );
  })();

  return getRequestById(id);
}

export function listResidentRequests(residentId: string) {
  return getSqliteDb()
    .prepare(
      "SELECT * FROM certificate_requests WHERE resident_id = ? ORDER BY date_requested DESC",
    )
    .all(residentId)
    .map((row) => requestFromRow(row as Row))
    .filter((row): row is CertificateRequest => Boolean(row))
    .map(withRelations);
}

export function listAllRequests() {
  return getSqliteDb()
    .prepare("SELECT * FROM certificate_requests ORDER BY date_requested DESC")
    .all()
    .map((row) => requestFromRow(row as Row))
    .filter((row): row is CertificateRequest => Boolean(row))
    .map(withRelations);
}

export function getRequestById(id: string) {
  const request = requestFromRow(
    getSqliteDb().prepare("SELECT * FROM certificate_requests WHERE id = ?").get(id) as
      | Row
      | undefined,
  );

  return request ? withRelations(request) : null;
}

export function getResidentRequestById(id: string, residentId: string) {
  const request = getRequestById(id);
  return request?.resident_id === residentId ? request : null;
}

export function updateRequestStatus(input: {
  dateAccepted?: string | null;
  dateReleased?: string | null;
  id: string;
  paymentStatus?: PaymentStatus;
  remarks?: string | null;
  status: RequestStatus;
}) {
  getSqliteDb()
    .prepare(
      `UPDATE certificate_requests
       SET status = ?, remarks = COALESCE(?, remarks), date_accepted = COALESCE(?, date_accepted),
           date_released = COALESCE(?, date_released), payment_status = COALESCE(?, payment_status),
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.status,
      input.remarks ?? null,
      input.dateAccepted ?? null,
      input.dateReleased ?? null,
      input.paymentStatus ?? null,
      nowIso(),
      input.id,
    );

  return getRequestById(input.id);
}

export function getLatestPaymentForRequest(requestId: string) {
  return paymentFromRow(
    getSqliteDb()
      .prepare("SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(requestId) as Row | undefined,
  );
}

export function createMockPayment(input: {
  amount: number;
  request_id: string;
  resident_id: string;
}) {
  const timestamp = nowIso();
  const id = randomUUID();
  const transactionId = `DEMO-PAY-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  getSqliteDb()
    .prepare(
      `INSERT INTO payments (id, request_id, resident_id, provider, provider_transaction_id, amount, currency, status, paid_at, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, 'mock_thesis_demo', ?, ?, 'PHP', 'pending', NULL, NULL, ?, ?)`,
    )
    .run(id, input.request_id, input.resident_id, transactionId, input.amount, timestamp, timestamp);
  getSqliteDb()
    .prepare("INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), id, "payment_initiated", stringifyJson({ simulated: true }), timestamp);
  return getLatestPaymentForRequest(input.request_id);
}

export function resolveMockPayment(input: {
  payment_id: string;
  resident_id: string;
  status: Extract<MockPaymentStatus, "paid" | "failed" | "cancelled">;
}) {
  const existing = paymentFromRow(
    getSqliteDb().prepare("SELECT * FROM payments WHERE id = ? AND resident_id = ?").get(input.payment_id, input.resident_id) as Row | undefined,
  );
  if (!existing || existing.status !== "pending") return null;
  const timestamp = nowIso();
  getSqliteDb()
    .prepare("UPDATE payments SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?")
    .run(input.status, input.status === "paid" ? timestamp : null, timestamp, input.payment_id);
  getSqliteDb()
    .prepare("INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(randomUUID(), input.payment_id, `mock_payment_${input.status}`, stringifyJson({ simulated: true }), timestamp);
  return getLatestPaymentForRequest(existing.request_id);
}

export function cancelRequest(id: string, residentId: string) {
  getSqliteDb()
    .prepare(
      `UPDATE certificate_requests
       SET status = 'cancelled', cancelled_at = ?, updated_at = ?
       WHERE id = ? AND resident_id = ? AND status = 'pending'`,
    )
    .run(nowIso(), nowIso(), id, residentId);

  return getResidentRequestById(id, residentId);
}

export function resubmitRejectedRequest(input: {
  age: number;
  birthdate?: string | null;
  contact_number: string;
  full_name: string;
  id: string;
  place_of_birth?: string | null;
  purpose: string;
  resident_id: string;
  sitio: string;
  years_of_residency?: number | null;
}) {
  const existing = getResidentRequestById(input.id, input.resident_id);
  if (!existing || existing.status !== "rejected") {
    return null;
  }

  const submittedData: Json = {
    certificate_specific: {
      birthdate: input.birthdate || null,
      place_of_birth: input.place_of_birth || null,
      years_of_residency: input.years_of_residency ?? null,
    },
    common: {
      address_sitio: input.sitio,
      age: input.age,
      contact_number: input.contact_number,
      date_requested: nowIso(),
      full_name: input.full_name,
      purpose: input.purpose,
    },
    placeholders: [
      "TODO: Rejected-request resubmission keeps the original request record for thesis demo simplicity.",
    ],
  };

  getSqliteDb()
    .prepare(
      `UPDATE certificate_requests
       SET purpose = ?, status = 'pending', remarks = NULL, submitted_data = ?,
           date_requested = ?, date_accepted = NULL, updated_at = ?
       WHERE id = ? AND resident_id = ?`,
    )
    .run(
      input.purpose,
      stringifyJson(submittedData),
      nowIso(),
      nowIso(),
      input.id,
      input.resident_id,
    );

  return getResidentRequestById(input.id, input.resident_id);
}

export function upsertPickupSchedule(input: {
  created_by: string;
  pickup_date: string;
  pickup_time: string;
  remarks?: string | null;
  request_id: string;
}) {
  const existing = getSqliteDb()
    .prepare("SELECT id FROM pickup_schedules WHERE request_id = ?")
    .get(input.request_id) as { id: string } | undefined;
  const timestamp = nowIso();

  if (existing) {
    getSqliteDb()
      .prepare(
        `UPDATE pickup_schedules
         SET pickup_date = ?, pickup_time = ?, remarks = ?, created_by = ?, updated_at = ?
         WHERE request_id = ?`,
      )
      .run(
        input.pickup_date,
        input.pickup_time,
        input.remarks || null,
        input.created_by,
        timestamp,
        input.request_id,
      );
  } else {
    getSqliteDb()
      .prepare(
        `INSERT INTO pickup_schedules (
          id, request_id, pickup_date, pickup_time, remarks, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomUUID(),
        input.request_id,
        input.pickup_date,
        input.pickup_time,
        input.remarks || null,
        input.created_by,
        timestamp,
        timestamp,
      );
  }

  return getSchedulesForRequest(input.request_id)[0] ?? null;
}

export function listPickupSchedules() {
  return getSqliteDb()
    .prepare("SELECT * FROM pickup_schedules ORDER BY pickup_date ASC, pickup_time ASC")
    .all()
    .map((row) => scheduleFromRow(row as Row))
    .filter((row): row is PickupSchedule => Boolean(row))
    .map((schedule): ScheduleWithRequest => ({
      ...schedule,
      request: getRequestById(schedule.request_id),
    }));
}

export function listSchedulableRequests() {
  return listAllRequests().filter((request) =>
    ["accepted", "ready_for_pickup"].includes(request.status),
  );
}

export function listResidents() {
  return getSqliteDb()
    .prepare(
      "SELECT * FROM profiles WHERE role = 'resident' ORDER BY created_at DESC",
    )
    .all()
    .map((row) => profileFromRow(row as Row))
    .filter((row): row is Profile => Boolean(row));
}

export function listResidentHistory(residentId: string) {
  return listResidentRequests(residentId);
}

export function issueCertificateRecord(input: {
  id: string;
  date_issued: string;
  issued_at: string;
  issuance_mode: CertificateRecord["issuance_mode"];
  pdf_path: string;
  pdf_sha256: string;
  prepared_by: string;
  request: CertificateRequest;
  template_data: Json;
}) {
  const existing = getSqliteDb()
    .prepare("SELECT id FROM certificate_records WHERE request_id = ? AND status = 'issued'")
    .get(input.request.id) as { id: string } | undefined;

  if (existing) return null;

  const certificateNumber = generateCertificateNumber();
  const verificationExpiresAt = new Date(
    new Date(input.issued_at).getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

    getSqliteDb()
      .prepare(
        `INSERT INTO certificate_records (
          id, request_id, certificate_type, resident_id, date_issued, prepared_by,
          control_number, template_data, pdf_path, certificate_number, status,
          issuance_mode, issued_at, issued_by, certificate_snapshot, pdf_sha256,
          verification_expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.request.id,
        input.request.certificate_type,
        input.request.resident_id,
        input.date_issued,
        input.prepared_by,
        input.request.control_number,
        stringifyJson(input.template_data),
        input.pdf_path,
        certificateNumber,
        input.issuance_mode,
        input.issued_at,
        input.prepared_by,
        stringifyJson(input.template_data),
        input.pdf_sha256,
        verificationExpiresAt,
        nowIso(),
      );

  const record = certificateRecordFromRow(
    getSqliteDb().prepare("SELECT * FROM certificate_records WHERE id = ?").get(input.id) as
      | Row
      | undefined,
  );

  const revokedRecord = getSqliteDb()
    .prepare(
      "SELECT id FROM certificate_records WHERE request_id = ? AND status = 'revoked' ORDER BY issued_at DESC LIMIT 1",
    )
    .get(input.request.id) as { id: string } | undefined;

  if (revokedRecord) {
    getSqliteDb()
      .prepare("UPDATE certificate_records SET replacement_record_id = ? WHERE id = ?")
      .run(input.id, revokedRecord.id);
  }

  return record;
}

export function getCertificateRecordByRequestId(requestId: string) {
  return certificateRecordFromRow(
    getSqliteDb()
      .prepare("SELECT * FROM certificate_records WHERE request_id = ? ORDER BY issued_at DESC LIMIT 1")
      .get(requestId) as Row | undefined,
  );
}

export function getCertificateRecordById(id: string) {
  return certificateRecordFromRow(
    getSqliteDb().prepare("SELECT * FROM certificate_records WHERE id = ?").get(id) as Row | undefined,
  );
}

export function revokeCertificateRecord(input: {
  id: string;
  reason: string;
  revokedBy: string;
}) {
  const timestamp = nowIso();
  const result = getSqliteDb()
    .prepare(
      `UPDATE certificate_records
       SET status = 'revoked', revoked_at = ?, revoked_by = ?, revocation_reason = ?
       WHERE id = ? AND status = 'issued'`,
    )
    .run(timestamp, input.revokedBy, input.reason, input.id);

  if (result.changes === 0) return false;

  getSqliteDb()
    .prepare(
      `UPDATE certificate_verifications
       SET status = 'revoked', revoked_at = ?
       WHERE certificate_record_id = ?`,
    )
    .run(timestamp, input.id);
  return true;
}

export function listResidentCertificateRecords(residentId: string) {
  return getSqliteDb().prepare(
    "SELECT * FROM certificate_records WHERE resident_id = ? ORDER BY issued_at DESC",
  ).all(residentId).map((row) => certificateRecordFromRow(row as Row)).filter((row): row is CertificateRecord => Boolean(row));
}

export function createCertificateDownloadLog(certificateRecordId: string, userId: string, result: string) {
  getSqliteDb().prepare(
    "INSERT INTO certificate_download_logs (id, certificate_record_id, user_id, result, downloaded_at) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), certificateRecordId, userId, result, nowIso());
}

export function generateVerificationToken() {
  return randomBytes(32).toString("base64url");
}

export function createCertificateVerification(input: {
  certificateRecordId: string;
  issuedAt: string;
  token: string;
}) {
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const expiresAt = new Date(new Date(input.issuedAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const timestamp = nowIso();
  const shortCode = `BB-${randomBytes(4).toString("hex").toUpperCase()}`;
  getSqliteDb().prepare(
    `INSERT INTO certificate_verifications (id, certificate_record_id, token_hash, short_verification_code, status, valid_from, expires_at, revoked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'valid', ?, ?, NULL, ?, ?)`,
  ).run(randomUUID(), input.certificateRecordId, tokenHash, shortCode, input.issuedAt, expiresAt, timestamp, timestamp);
  return { expiresAt, shortCode };
}

export function getCertificateVerificationByToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = getSqliteDb().prepare(
    `SELECT v.*, c.certificate_number, c.certificate_type, c.date_issued, c.status AS certificate_status,
            c.pdf_sha256, p.full_name
     FROM certificate_verifications v
     JOIN certificate_records c ON c.id = v.certificate_record_id
     JOIN profiles p ON p.id = c.resident_id
     WHERE v.token_hash = ?`,
  ).get(tokenHash) as Row | undefined;
  if (!row) return null;
  const expiresAt = String(row.expires_at);
  const revoked = row.revoked_at !== null || row.certificate_status === "revoked";
  const expired = new Date(expiresAt).getTime() < Date.now();
  return {
    certificateNumber: String(row.certificate_number),
    certificateType: String(row.certificate_type) as CertificateType,
    dateIssued: String(row.date_issued),
    expiresAt,
    fullName: String(row.full_name),
    pdfSha256: asText(row.pdf_sha256),
    shortCode: String(row.short_verification_code),
    status: revoked ? "revoked" : expired ? "expired" : "valid",
  } as const;
}

export function createActivityLog(input: {
  action: string;
  affected_record_id?: string | null;
  affected_table?: string | null;
  profile: Profile;
  remarks?: string | null;
}) {
  getSqliteDb()
    .prepare(
      `INSERT INTO activity_logs (
        id, user_id, role, action, affected_table, affected_record_id, remarks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.profile.id,
      input.profile.role,
      input.action,
      input.affected_table || null,
      input.affected_record_id || null,
      input.remarks || null,
      nowIso(),
    );
}

export function listActivityLogs() {
  return getSqliteDb()
    .prepare("SELECT * FROM activity_logs ORDER BY created_at DESC")
    .all()
    .map((row) => {
      const log = row as Row;
      const userId = asText(log.user_id);
      const user = userId ? getProfileById(userId) : null;

      return {
        action: String(log.action),
        affected_record_id: asText(log.affected_record_id),
        affected_table: asText(log.affected_table),
        created_at: String(log.created_at),
        id: String(log.id),
        remarks: asText(log.remarks),
        role: String(log.role),
        user: user
          ? {
              email: user.email,
              full_name: user.full_name,
            }
          : null,
        user_id: userId,
      };
    });
}

export function createNotificationLog(input: {
  message: string;
  provider_response?: Json | null;
  recipient_email: string;
  request_id?: string | null;
  status: string;
  subject: string;
}) {
  getSqliteDb()
    .prepare(
      `INSERT INTO notification_logs (
        id, request_id, recipient_email, subject, message, status, provider_response, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      input.request_id || null,
      input.recipient_email,
      input.subject,
      input.message,
      input.status,
      stringifyJson(input.provider_response ?? null),
      nowIso(),
    );
}

export function getSystemSettings(): SystemSettings {
  const rows = getSqliteDb()
    .prepare("SELECT * FROM system_settings")
    .all()
    .map((row) => row as Row);

  const settings = new Map<string, SystemSetting>();

  for (const row of rows) {
    settings.set(String(row.key), {
      created_at: String(row.created_at),
      id: String(row.id),
      key: String(row.key),
      updated_at: String(row.updated_at),
      value: parseJson(row.value),
    });
  }

  return {
    barangayCaptainName:
      (settings.get("barangay_captain_name")?.value as string | undefined) ??
      "Barangay Captain Name",
    signatureImagePath:
      (settings.get("signature_image_path")?.value as string | undefined) ?? null,
  };
}

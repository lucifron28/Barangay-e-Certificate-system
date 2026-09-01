import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getTursoDb, allTurso, prepareTurso, runTurso } from "@/lib/db/turso/client";
import {
  getCertificateFee,
  getDefaultPaymentStatus,
} from "@/lib/services/business-rules";
import { isVerificationExpired } from "@/lib/certificates/certificate-status";
import { applyDemoPaymentFallback } from "@/lib/payments/demo-config";
import { CERTIFICATE_PURPOSE_MAX_LENGTH } from "@/lib/services/certificate-request-rules";
import { env } from "@/lib/env";
import type { RequestStats } from "@/lib/utils/dashboard";
import type { CertificateDownloadResult } from "@/lib/certificates/certificate-download";
import type {
  CertificateRecord,
  CertificateRequest,
  CertificateSnapshot,
  Json,
  NotificationLog,
  Payment,
  PaymentEvent,
  PaymentMethodConfig,
  PaymentReceivingSettings,
  PaymentWithDetails,
  PickupSchedule,
  Profile,
  SystemSetting,
} from "@/types/database";
import type {
  CertificateType,
  PaymentRecordStatus,
  PaymentStatus,
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
export type DashboardData = {
  stats: RequestStats;
  mostRequested: CertificateType | null;
  recentRequests: RequestWithResident[];
  monthlyCount: number;
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
  paymentReceiving: PaymentReceivingSettings;
  signatureImagePath: string | null;
  signatureImageProvider: "local" | "vercel_blob" | null;
  signatureImageSha256: string | null;
  signatureImageUpdatedAt: string | null;
};

export const DEFAULT_PAYMENT_RECEIVING_SETTINGS: PaymentReceivingSettings = {
  gcash: {
    enabled: false,
    merchantName: "",
    qrStorageKey: null,
    qrStorageProvider: null,
    qrUpdatedAt: null,
  },
  maya: {
    enabled: false,
    merchantName: "",
    qrStorageKey: null,
    qrStorageProvider: null,
    qrUpdatedAt: null,
  },
};

function parsePaymentMethodConfig(
  val: unknown,
  defaultName = "",
): PaymentMethodConfig {
  if (!val || typeof val !== "object") {
    return {
      enabled: false,
      merchantName: defaultName,
      qrStorageKey: null,
      qrStorageProvider: null,
      qrUpdatedAt: null,
    };
  }
  const obj = val as Record<string, unknown>;
  const merchantName =
    typeof obj.merchantName === "string" ? obj.merchantName.trim() : defaultName;
  const qrStorageKey =
    typeof obj.qrStorageKey === "string" && obj.qrStorageKey.trim()
      ? obj.qrStorageKey.trim()
      : null;
  const canBeEnabled = Boolean(merchantName && qrStorageKey);
  return {
    enabled: Boolean(obj.enabled) && canBeEnabled,
    merchantName,
    qrStorageKey,
    qrStorageProvider:
      obj.qrStorageProvider === "vercel_blob"
        ? "vercel_blob"
        : obj.qrStorageProvider === "local"
          ? "local"
          : null,
    qrUpdatedAt: typeof obj.qrUpdatedAt === "string" ? obj.qrUpdatedAt : null,
  };
}

type Row = Record<string, unknown>;
type Executor = {
  get(sql: string, ...args: unknown[]): Promise<unknown>;
  run(sql: string, ...args: unknown[]): Promise<unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value: unknown): Json {
  if (typeof value !== "string") return (value as Json) ?? null;
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
  return value === null || value === undefined ? null : String(value);
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function rowsAffected(result: unknown) {
  const mutation = result as
    | { changes?: number; rowsAffected?: number }
    | undefined;
  return Number(mutation?.rowsAffected ?? mutation?.changes ?? 0);
}

function profileFromRow(row: Row | undefined): Profile | null {
  if (!row) return null;
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
  if (!row) return null;
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
  if (!row) return null;
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
  if (!row) return null;
  return {
    certificate_number: asText(row.certificate_number),
    certificate_snapshot: parseJson(row.certificate_snapshot) as CertificateSnapshot,
    certificate_type: String(row.certificate_type) as CertificateType,
    control_number: asText(row.control_number),
    created_at: String(row.created_at),
    date_issued: String(row.date_issued),
    id: String(row.id),
    pdf_path: asText(row.pdf_path),
    pdf_storage_provider: (asText(row.pdf_storage_provider) ?? "local") as "local" | "vercel_blob",
    pdf_storage_key: asText(row.pdf_storage_key),
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
    proof_sha256: asText(row.proof_sha256),
    proof_storage_key: asText(row.proof_storage_key),
    proof_storage_provider:
      (asText(row.proof_storage_provider) as "local" | "vercel_blob" | null) ?? null,
    provider: String(row.provider),
    provider_transaction_id: String(row.provider_transaction_id),
    request_id: String(row.request_id),
    resident_id: String(row.resident_id),
    review_remarks: asText(row.review_remarks),
    reviewed_at: asText(row.reviewed_at),
    reviewed_by: asText(row.reviewed_by),
    status: String(row.status) as PaymentRecordStatus,
    submitted_at: asText(row.submitted_at),
    transaction_datetime: asText(row.transaction_datetime),
    updated_at: String(row.updated_at),
  };
}

function paymentEventFromRow(row: Row | undefined): PaymentEvent | null {
  if (!row) return null;
  return {
    created_at: String(row.created_at),
    event_type: String(row.event_type),
    id: String(row.id),
    payload: parseJson(row.payload),
    payment_id: String(row.payment_id),
  };
}


function notificationLogFromRow(row: Row | undefined): NotificationLog | null {
  if (!row) return null;
  return {
    created_at: String(row.created_at),
    id: String(row.id),
    message: String(row.message),
    provider_response: parseJson(row.provider_response),
    recipient_email: String(row.recipient_email),
    request_id: asText(row.request_id),
    status: String(row.status),
    subject: String(row.subject),
  };
}

async function getSchedulesForRequest(requestId: string) {
  const rows = await allTurso<Row>(
    "SELECT * FROM pickup_schedules WHERE request_id = ? ORDER BY pickup_date ASC",
    [requestId],
  );
  return rows.map(scheduleFromRow).filter((row): row is PickupSchedule => Boolean(row));
}

const REQUEST_WITH_RESIDENT_SELECT = `
  SELECT
    r.*,
    p.id AS resident_profile_id,
    p.auth_user_id AS resident_auth_user_id,
    p.full_name AS resident_full_name,
    p.email AS resident_email,
    p.username AS resident_username,
    p.contact_number AS resident_contact_number,
    p.address_sitio AS resident_address_sitio,
    p.age AS resident_age,
    p.gender AS resident_gender,
    p.civil_status AS resident_civil_status,
    p.date_of_birth AS resident_date_of_birth,
    p.occupation AS resident_occupation,
    p.password_hash AS resident_password_hash,
    p.role AS resident_role,
    p.created_at AS resident_created_at,
    p.updated_at AS resident_updated_at
  FROM certificate_requests r
  LEFT JOIN profiles p ON p.id = r.resident_id
`;

function requestWithResidentFromJoinedRow(row: Row | undefined): RequestWithResident | null {
  if (!row) return null;
  const request = requestFromRow(row);
  if (!request) return null;

  const residentId = asText(row.resident_profile_id) ?? asText(row.resident_id);
  const resident: Profile | null = row.resident_full_name
    ? {
        address_sitio: asText(row.resident_address_sitio),
        age: asNumber(row.resident_age),
        auth_user_id: asText(row.resident_auth_user_id),
        civil_status: asText(row.resident_civil_status),
        contact_number: asText(row.resident_contact_number) ?? "",
        created_at: String(row.resident_created_at ?? request.created_at),
        date_of_birth: asText(row.resident_date_of_birth),
        email: String(row.resident_email ?? ""),
        full_name: String(row.resident_full_name),
        gender: asText(row.resident_gender),
        id: String(residentId),
        occupation: asText(row.resident_occupation),
        password_hash: asText(row.resident_password_hash),
        role: (String(row.resident_role ?? "resident")) as ProfileRole,
        updated_at: String(row.resident_updated_at ?? request.updated_at),
        username: asText(row.resident_username),
      }
    : null;

  return {
    ...request,
    pickup_schedules: [],
    resident,
  };
}

async function withRelations(request: CertificateRequest): Promise<RequestWithResident> {
  const resident = await getProfileById(request.resident_id);
  return { ...request, pickup_schedules: [], resident };
}

export async function getProfileById(id: string) {
  return profileFromRow(await prepareTurso<Row>("SELECT * FROM profiles WHERE id = ?", [id]));
}

export async function createAuthSession(input: {
  expires_at: string;
  id: string;
  profile_id: string;
  token_hash: string;
}) {
  const timestamp = nowIso();
  await runTurso(
    `INSERT INTO auth_sessions (id, profile_id, token_hash, created_at, expires_at, last_seen_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    [input.id, input.profile_id, input.token_hash, timestamp, input.expires_at, timestamp],
  );
}

export async function getAuthSessionProfileByTokenHash(tokenHash: string) {
  return profileFromRow(
    await prepareTurso<Row>(
      `SELECT p.*
       FROM auth_sessions s
       JOIN profiles p ON p.id = s.profile_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?
       LIMIT 1`,
      [tokenHash, nowIso()],
    ),
  );
}

export async function touchAuthSession(tokenHash: string) {
  await runTurso(
    "UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    [nowIso(), tokenHash],
  );
}

export async function revokeAuthSession(tokenHash: string) {
  await runTurso(
    "UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    [nowIso(), tokenHash],
  );
}

export async function findProfileByLogin(login: string) {
  const normalized = login.trim().toLowerCase();
  return profileFromRow(
    await prepareTurso<Row>(
      "SELECT * FROM profiles WHERE lower(email) = ? OR lower(username) = ? LIMIT 1",
      [normalized, normalized],
    ),
  );
}

export async function profileExists(email: string, username?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username?.trim().toLowerCase() || null;
  return Boolean(
    await prepareTurso<Row>(
      "SELECT id FROM profiles WHERE lower(email) = ? OR (? IS NOT NULL AND lower(username) = ?) LIMIT 1",
      [normalizedEmail, normalizedUsername, normalizedUsername],
    ),
  );
}

export async function createProfile(input: {
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
  await runTurso(
    `INSERT INTO profiles (
      id, auth_user_id, full_name, age, address_sitio, date_of_birth,
      civil_status, contact_number, gender, occupation, email, username,
      password_hash, role, created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );
  const profile = await getProfileById(id);
  if (!profile) throw new Error("Created profile could not be loaded.");
  return profile;
}

export async function updateProfile(
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
  await runTurso(
    `UPDATE profiles
     SET full_name = ?, age = ?, address_sitio = ?, date_of_birth = ?,
         civil_status = ?, contact_number = ?, gender = ?, occupation = ?,
         username = ?, updated_at = ?
     WHERE id = ?`,
    [
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
    ],
  );
  return getProfileById(id);
}

type CounterType = "request_number" | "barangay_clearance_control_number" | "certificate_number";

async function nextDocumentCounter(counterType: CounterType, executor?: Executor) {
  const year = new Date().getFullYear();
  const timestamp = nowIso();
  const runWithExecutor = async (tx: Executor) => {
    const row = (await tx.get(
      `INSERT INTO document_counters (id, counter_type, year, current_value, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(counter_type, year) DO UPDATE SET
         current_value = document_counters.current_value + 1,
         updated_at = excluded.updated_at
       RETURNING current_value`,
      randomUUID(),
      counterType,
      year,
      timestamp,
      timestamp,
    )) as { current_value: number } | undefined;
    if (!row) throw new Error("DOCUMENT_COUNTER_FAILED");
    return { value: asNumber(row.current_value), year };
  };

  if (executor) return runWithExecutor(executor);
  const run = getTursoDb().transactionAsync(async (tx) =>
    runWithExecutor({
      get: (sql, ...args) => tx.get(sql, ...args),
      run: (sql, ...args) => tx.run(sql, ...args),
    }),
  );
  return run();
}

export async function generateRequestNumber() {
  const counter = await nextDocumentCounter("request_number");
  return `REQ-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export async function generateClearanceControlNumber() {
  const counter = await nextDocumentCounter("barangay_clearance_control_number");
  return `BCL-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export async function generateCertificateNumber() {
  const counter = await nextDocumentCounter("certificate_number");
  return `CERT-${counter.year}-${String(counter.value).padStart(4, "0")}`;
}

export function allocateCertificateNumber() {
  return generateCertificateNumber();
}

export async function reserveCertificateIssuance(input: {
  certificate_record_id: string;
  request_id: string;
  reserved_by: string;
}) {
  const db = getTursoDb();
  const run = db.transactionAsync(async (tx) => {
    const existing = (await tx.get(
      "SELECT status FROM issuance_reservations WHERE request_id = ? AND status IN ('reserved', 'finalized') LIMIT 1",
      input.request_id,
    )) as { status: string } | undefined;
    if (existing) {
      throw new Error(
        existing.status === "finalized"
          ? "CERTIFICATE_ALREADY_ISSUED"
          : "CERTIFICATE_ISSUANCE_IN_PROGRESS",
      );
    }
    const counterRow = (await tx.get(
      `INSERT INTO document_counters (id, counter_type, year, current_value, created_at, updated_at)
       VALUES (?, 'certificate_number', ?, 1, ?, ?)
       ON CONFLICT(counter_type, year) DO UPDATE SET
         current_value = document_counters.current_value + 1,
         updated_at = excluded.updated_at
       RETURNING year, current_value`,
      randomUUID(),
      new Date().getFullYear(),
      nowIso(),
      nowIso(),
    )) as { current_value: number; year: number } | undefined;
    if (!counterRow) throw new Error("DOCUMENT_COUNTER_FAILED");
    const certificateNumber = `CERT-${counterRow.year}-${String(counterRow.current_value).padStart(4, "0")}`;
    await tx.run(
      `INSERT INTO issuance_reservations (
        id, request_id, certificate_record_id, certificate_number, reserved_by, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'reserved', ?)`,
      randomUUID(),
      input.request_id,
      input.certificate_record_id,
      certificateNumber,
      input.reserved_by,
      nowIso(),
    );
    return certificateNumber;
  });
  return run();
}

export async function finalizeCertificateIssuanceReservation(certificateRecordId: string) {
  await runTurso(
    "UPDATE issuance_reservations SET status = 'finalized', finalized_at = ? WHERE certificate_record_id = ? AND status = 'reserved'",
    [nowIso(), certificateRecordId],
  );
}

export async function releaseCertificateIssuanceReservation(certificateRecordId: string) {
  await runTurso(
    "UPDATE issuance_reservations SET status = 'released', released_at = ? WHERE certificate_record_id = ? AND status = 'reserved'",
    [nowIso(), certificateRecordId],
  );
}

export async function createCertificateRequest(input: {
  age: number;
  birthdate?: string | null;
  certificate_type: CertificateType;
  contact_number: string;
  full_name: string;
  place_of_birth?: string | null;
  purpose: string;
  resident_id: string;
  sitio?: string | null;
  years_of_residency?: number | null;
}) {
  if (input.purpose.trim().length > CERTIFICATE_PURPOSE_MAX_LENGTH) return null;
  const id = randomUUID();
  const timestamp = nowIso();
  const purpose = input.purpose.trim();
  const feeAmount = getCertificateFee(input.certificate_type);
  const paymentStatus = getDefaultPaymentStatus(input.certificate_type);
  const submittedData: Json = {
    certificate_specific: {
      birthdate: input.birthdate || null,
      place_of_birth: input.place_of_birth || null,
      years_of_residency: input.years_of_residency ?? null,
    },
    common: {
      address_sitio: input.sitio || null,
      age: input.age,
      contact_number: input.contact_number,
      date_requested: timestamp,
      full_name: input.full_name,
      purpose,
    },
  };
  const run = getTursoDb().transactionAsync(async (tx) => {
    const executor: Executor = {
      get: (sql, ...args) => tx.get(sql, ...args),
      run: (sql, ...args) => tx.run(sql, ...args),
    };
    const requestCounter = await nextDocumentCounter("request_number", executor);
    const requestNumber = `REQ-${requestCounter.year}-${String(requestCounter.value).padStart(4, "0")}`;
    const controlCounter =
      input.certificate_type === "barangay_clearance"
        ? await nextDocumentCounter("barangay_clearance_control_number", executor)
        : null;
    const controlNumber = controlCounter
      ? `BCL-${controlCounter.year}-${String(controlCounter.value).padStart(4, "0")}`
      : null;
    await tx.run(
      `INSERT INTO certificate_requests (
        id, request_number, resident_id, certificate_type, purpose, status,
        remarks, submitted_data, control_number, fee_amount, payment_status,
        date_requested, date_accepted, date_released, cancelled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
      id,
      requestNumber,
      input.resident_id,
      input.certificate_type,
      purpose,
      stringifyJson(submittedData),
      controlNumber,
      feeAmount,
      paymentStatus,
      timestamp,
      timestamp,
      timestamp,
    );
  });
  await run();
  return getRequestById(id);
}

export async function listResidentRequests(residentId: string): Promise<RequestWithResident[]> {
  const rows = await allTurso<Row>(
    `${REQUEST_WITH_RESIDENT_SELECT} WHERE r.resident_id = ? ORDER BY r.date_requested DESC`,
    [residentId],
  );
  return rows
    .map(requestWithResidentFromJoinedRow)
    .filter((row): row is RequestWithResident => Boolean(row));
}

export async function listAllRequests(): Promise<RequestWithResident[]> {
  const rows = await allTurso<Row>(
    `${REQUEST_WITH_RESIDENT_SELECT} ORDER BY r.date_requested DESC`,
  );
  return rows
    .map(requestWithResidentFromJoinedRow)
    .filter((row): row is RequestWithResident => Boolean(row));
}

export async function getAdminDashboardData(monthPrefix?: string): Promise<DashboardData> {
  const month = monthPrefix || new Date().toISOString().slice(0, 7);
  const monthPattern = `${month}%`;

  const [aggregateRow, typeCountRows, recentRows] = await Promise.all([
    prepareTurso<Row>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status = 'ready_for_download' THEN 1 ELSE 0 END) AS ready_for_download,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN date_requested LIKE ? THEN 1 ELSE 0 END) AS monthly_count
      FROM certificate_requests`,
      [monthPattern],
    ),
    allTurso<Row>(
      `SELECT certificate_type, COUNT(*) AS count
       FROM certificate_requests
       GROUP BY certificate_type
       ORDER BY count DESC
       LIMIT 1`,
    ),
    allTurso<Row>(
      `${REQUEST_WITH_RESIDENT_SELECT} ORDER BY r.date_requested DESC LIMIT 6`,
    ),
  ]);

  const stats: RequestStats = {
    accepted: asNumber(aggregateRow?.accepted),
    cancelled: asNumber(aggregateRow?.cancelled),
    done: asNumber(aggregateRow?.done),
    pending: asNumber(aggregateRow?.pending),
    ready_for_download: asNumber(aggregateRow?.ready_for_download),
    rejected: asNumber(aggregateRow?.rejected),
    total: asNumber(aggregateRow?.total),
  };

  const mostRequested = typeCountRows[0]
    ? (String(typeCountRows[0].certificate_type) as CertificateType)
    : null;

  const recentRequests = recentRows
    .map(requestWithResidentFromJoinedRow)
    .filter((row): row is RequestWithResident => Boolean(row));

  const monthlyCount = asNumber(aggregateRow?.monthly_count);

  return {
    stats,
    mostRequested,
    recentRequests,
    monthlyCount,
  };
}

export async function getResidentDashboardData(residentId: string): Promise<DashboardData> {
  const [aggregateRow, typeCountRows, recentRows] = await Promise.all([
    prepareTurso<Row>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status = 'ready_for_download' THEN 1 ELSE 0 END) AS ready_for_download,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
      FROM certificate_requests
      WHERE resident_id = ?`,
      [residentId],
    ),
    allTurso<Row>(
      `SELECT certificate_type, COUNT(*) AS count
       FROM certificate_requests
       WHERE resident_id = ?
       GROUP BY certificate_type
       ORDER BY count DESC
       LIMIT 1`,
      [residentId],
    ),
    allTurso<Row>(
      `${REQUEST_WITH_RESIDENT_SELECT} WHERE r.resident_id = ? ORDER BY r.date_requested DESC LIMIT 5`,
      [residentId],
    ),
  ]);

  const stats: RequestStats = {
    accepted: asNumber(aggregateRow?.accepted),
    cancelled: asNumber(aggregateRow?.cancelled),
    done: asNumber(aggregateRow?.done),
    pending: asNumber(aggregateRow?.pending),
    ready_for_download: asNumber(aggregateRow?.ready_for_download),
    rejected: asNumber(aggregateRow?.rejected),
    total: asNumber(aggregateRow?.total),
  };

  const mostRequested = typeCountRows[0]
    ? (String(typeCountRows[0].certificate_type) as CertificateType)
    : null;

  const recentRequests = recentRows
    .map(requestWithResidentFromJoinedRow)
    .filter((row): row is RequestWithResident => Boolean(row));

  return {
    stats,
    mostRequested,
    recentRequests,
    monthlyCount: 0,
  };
}

export async function getRequestById(id: string) {
  const request = requestFromRow(await prepareTurso<Row>("SELECT * FROM certificate_requests WHERE id = ?", [id]));
  return request ? withRelations(request) : null;
}

export async function getResidentRequestById(id: string, residentId: string) {
  const request = await getRequestById(id);
  return request?.resident_id === residentId ? request : null;
}

export async function updateRequestStatus(input: {
  dateAccepted?: string | null;
  dateReleased?: string | null;
  id: string;
  paymentStatus?: PaymentStatus;
  remarks?: string | null;
  status: RequestStatus;
}) {
  await runTurso(
    `UPDATE certificate_requests
     SET status = ?, remarks = COALESCE(?, remarks), date_accepted = COALESCE(?, date_accepted),
         date_released = COALESCE(?, date_released), payment_status = COALESCE(?, payment_status),
         updated_at = ?
     WHERE id = ?`,
    [
      input.status,
      input.remarks ?? null,
      input.dateAccepted ?? null,
      input.dateReleased ?? null,
      input.paymentStatus ?? null,
      nowIso(),
      input.id,
    ],
  );
  return getRequestById(input.id);
}

export async function getLatestPaymentForRequest(requestId: string) {
  const row = await prepareTurso<Row>(
    "SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1",
    [requestId],
  );
  if (row && row.status === "pending" && row.expires_at && new Date(String(row.expires_at)).getTime() <= Date.now()) {
    await runTurso(
      "UPDATE payments SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'",
      [nowIso(), row.id],
    );
    return paymentFromRow({ ...row, status: "expired" });
  }
  return paymentFromRow(row);
}

export async function listPaymentsForRequest(requestId: string) {
  const rows = await allTurso<Row>(
    "SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC",
    [requestId],
  );
  return rows.map(paymentFromRow).filter((row): row is Payment => Boolean(row));
}

export async function listNotificationLogsForRequest(requestId: string) {
  const rows = await allTurso<Row>(
    "SELECT * FROM notification_logs WHERE request_id = ? ORDER BY created_at DESC",
    [requestId],
  );
  return rows.map(notificationLogFromRow).filter((row): row is NotificationLog => Boolean(row));
}

export async function hasSuccessfulPayment(requestId: string, residentId: string) {
  return Boolean(
    await prepareTurso<Row>(
      "SELECT id FROM payments WHERE request_id = ? AND resident_id = ? AND status = 'paid' AND provider IN ('gcash', 'maya') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL LIMIT 1",
      [requestId, residentId],
    ),
  );
}

export async function hasEligibleFeePayingRequest(residentId: string): Promise<boolean> {
  return Boolean(
    await prepareTurso<Row>(
      `SELECT id FROM certificate_requests
       WHERE resident_id = ?
         AND status = 'accepted'
         AND fee_amount > 0
         AND payment_status = 'unpaid'
       LIMIT 1`,
      [residentId],
    ),
  );
}

export async function submitPaymentProof(input: {
  proofSha256: string;
  proofStorageKey: string;
  proofStorageProvider: "local" | "vercel_blob";
  provider: "gcash" | "maya";
  referenceNumber: string;
  requestId: string;
  residentId: string;
  transactionDatetime: string;
}) {
  const id = randomUUID();
  const timestamp = nowIso();
  const normalizedRef = input.referenceNumber.trim().toUpperCase();

  // 1. Check if this reference number was already verified/paid on ANY request
  const alreadyPaid = await prepareTurso<Row>(
    "SELECT id FROM payments WHERE provider_transaction_id = ? AND status = 'paid'",
    [normalizedRef],
  );
  if (alreadyPaid) {
    throw new Error("This reference number has already been verified and cannot be reused.");
  }

  // 2. Check duplicate reference across DIFFERENT requests
  const existingOnOtherRequest = await prepareTurso<Row>(
    "SELECT id, request_id FROM payments WHERE provider_transaction_id = ? AND request_id != ?",
    [normalizedRef, input.requestId],
  );
  if (existingOnOtherRequest) {
    throw new Error("This reference number has already been submitted for another request.");
  }

  const run = getTursoDb().transactionAsync(async (tx) => {
    const request = requestFromRow(
      (await tx.get(
        "SELECT * FROM certificate_requests WHERE id = ?",
        input.requestId,
      )) as Row | undefined,
    );
    if (
      !request ||
      request.resident_id !== input.residentId ||
      request.status !== "accepted" ||
      request.payment_status !== "unpaid" ||
      request.fee_amount <= 0
    ) {
      return false;
    }

    const existingPaymentRow = (await tx.get(
      "SELECT * FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1",
      input.requestId,
    )) as Row | undefined;
    const existingPayment = paymentFromRow(existingPaymentRow);

    if (existingPayment && ["pending", "failed"].includes(existingPayment.status)) {
      const isResubmission = existingPayment.status === "failed";

      await tx.run(
        `UPDATE payments
         SET provider = ?, provider_transaction_id = ?, amount = ?, currency = 'PHP',
             status = 'pending', submitted_at = ?, transaction_datetime = ?,
             proof_storage_provider = ?, proof_storage_key = ?, proof_sha256 = ?,
             paid_at = NULL, reviewed_at = NULL, reviewed_by = NULL, review_remarks = NULL,
             updated_at = ?
         WHERE id = ?`,
        input.provider,
        normalizedRef,
        request.fee_amount,
        timestamp,
        input.transactionDatetime,
        input.proofStorageProvider,
        input.proofStorageKey,
        input.proofSha256,
        timestamp,
        existingPayment.id,
      );

      await tx.run(
        "INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
        randomUUID(),
        existingPayment.id,
        isResubmission ? "payment_proof_resubmitted" : "payment_proof_submitted",
        stringifyJson({
          is_resubmission: isResubmission,
          previous_proof_sha256: existingPayment.proof_sha256,
          previous_reference: existingPayment.provider_transaction_id,
          previous_rejection_reason: existingPayment.review_remarks,
          provider: input.provider,
          reference: normalizedRef,
          sha256: input.proofSha256,
        }),
        timestamp,
      );
      return true;
    }

    await tx.run(
      `INSERT INTO payments (
        id, request_id, resident_id, provider, provider_transaction_id, amount,
        currency, status, submitted_at, transaction_datetime, proof_storage_provider,
        proof_storage_key, proof_sha256, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PHP', 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.requestId,
      input.residentId,
      input.provider,
      normalizedRef,
      request.fee_amount,
      timestamp,
      input.transactionDatetime,
      input.proofStorageProvider,
      input.proofStorageKey,
      input.proofSha256,
      timestamp,
      timestamp,
    );

    await tx.run(
      "INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
      randomUUID(),
      id,
      "payment_proof_submitted",
      stringifyJson({
        provider: input.provider,
        reference: normalizedRef,
        sha256: input.proofSha256,
      }),
      timestamp,
    );
    return true;
  });

  if (!(await run())) return null;
  return getLatestPaymentForRequest(input.requestId);
}

export async function confirmPaymentProof(input: {
  paymentId: string;
  reviewerId: string;
  remarks?: string | null;
}) {
  const timestamp = nowIso();
  const run = getTursoDb().transactionAsync(async (tx) => {
    // 1. Verify reviewer authorization
    const reviewer = (await tx.get(
      "SELECT id, role FROM profiles WHERE id = ?",
      input.reviewerId,
    )) as { id: string; role: string } | undefined;
    if (!reviewer || !["main_admin", "barangay_secretary"].includes(reviewer.role)) {
      throw new Error("Reviewer is not authorized to confirm payments.");
    }

    // 2. Fetch and validate payment
    const paymentRow = (await tx.get(
      "SELECT * FROM payments WHERE id = ?",
      input.paymentId,
    )) as Row | undefined;
    const payment = paymentFromRow(paymentRow);
    if (!payment) {
      throw new Error("Payment record not found.");
    }

    if (payment.status !== "pending") {
      throw new Error("Payment is not in pending verification status.");
    }

    if (payment.provider !== "gcash" && payment.provider !== "maya") {
      throw new Error("Unsupported payment provider.");
    }

    if (!payment.provider_transaction_id || !payment.provider_transaction_id.trim()) {
      throw new Error("Payment reference number is missing.");
    }

    if (!payment.proof_storage_key || !payment.proof_sha256) {
      throw new Error("Payment proof screenshot or verification checksum is missing.");
    }

    if (payment.reviewed_at !== null || payment.reviewed_by !== null) {
      throw new Error("Payment has already been reviewed.");
    }

    // 3. Fetch and validate request
    const request = requestFromRow(
      (await tx.get(
        "SELECT * FROM certificate_requests WHERE id = ?",
        payment.request_id,
      )) as Row | undefined,
    );
    if (!request) {
      throw new Error("Associated certificate request not found.");
    }

    if (request.status !== "accepted") {
      throw new Error("Certificate request must be in accepted status before payment confirmation.");
    }

    if (payment.resident_id !== request.resident_id) {
      throw new Error("Payment resident does not match the certificate request owner.");
    }

    if (request.fee_amount <= 0) {
      throw new Error("Certificate request has zero fee and does not require payment.");
    }

    if (payment.amount !== request.fee_amount) {
      throw new Error("Payment amount does not match the required certificate fee.");
    }

    // 4. Ensure certificate has not already been issued
    const existingIssuedCert = (await tx.get(
      "SELECT id FROM certificate_records WHERE request_id = ? AND status = 'issued'",
      request.id,
    )) as { id: string } | undefined;
    if (existingIssuedCert) {
      throw new Error("A certificate has already been issued for this request.");
    }

    // 5. Ensure duplicate verified/paid reference is not present
    const duplicatePaid = (await tx.get(
      "SELECT id FROM payments WHERE provider_transaction_id = ? AND status = 'paid' AND id != ?",
      payment.provider_transaction_id,
      payment.id,
    )) as { id: string } | undefined;
    if (duplicatePaid) {
      throw new Error("This reference number has already been verified for another payment.");
    }

    // 6. Atomically update payment and request
    await tx.run(
      `UPDATE payments
       SET status = 'paid', paid_at = ?, reviewed_at = ?, reviewed_by = ?, review_remarks = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`,
      timestamp,
      timestamp,
      input.reviewerId,
      input.remarks ?? null,
      timestamp,
      input.paymentId,
    );

    await tx.run(
      `UPDATE certificate_requests
       SET payment_status = 'paid', updated_at = ?
       WHERE id = ?`,
      timestamp,
      payment.request_id,
    );

    await tx.run(
      "INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
      randomUUID(),
      input.paymentId,
      "payment_verified",
      stringifyJson({
        remarks: input.remarks ?? null,
        reviewer_id: input.reviewerId,
        verified_at: timestamp,
      }),
      timestamp,
    );
    return true;
  });

  if (!(await run())) return null;
  return getPaymentById(input.paymentId);
}

export async function rejectPaymentProof(input: {
  paymentId: string;
  rejectionReason: string;
  reviewerId: string;
}) {
  if (!input.rejectionReason || !input.rejectionReason.trim()) {
    throw new Error("A rejection reason is required.");
  }
  const timestamp = nowIso();
  const run = getTursoDb().transactionAsync(async (tx) => {
    const reviewer = (await tx.get(
      "SELECT id, role FROM profiles WHERE id = ?",
      input.reviewerId,
    )) as { id: string; role: string } | undefined;
    if (!reviewer || !["main_admin", "barangay_secretary"].includes(reviewer.role)) {
      throw new Error("Reviewer is not authorized to reject payments.");
    }

    const paymentRow = (await tx.get(
      "SELECT * FROM payments WHERE id = ?",
      input.paymentId,
    )) as Row | undefined;
    const payment = paymentFromRow(paymentRow);
    if (!payment || payment.status !== "pending") return false;

    await tx.run(
      `UPDATE payments
       SET status = 'failed', reviewed_at = ?, reviewed_by = ?, review_remarks = ?, updated_at = ?
       WHERE id = ? AND status = 'pending'`,
      timestamp,
      input.reviewerId,
      input.rejectionReason.trim(),
      timestamp,
      input.paymentId,
    );

    await tx.run(
      `UPDATE certificate_requests
       SET payment_status = 'unpaid', updated_at = ?
       WHERE id = ?`,
      timestamp,
      payment.request_id,
    );

    await tx.run(
      "INSERT INTO payment_events (id, payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
      randomUUID(),
      input.paymentId,
      "payment_rejected",
      stringifyJson({
        reason: input.rejectionReason.trim(),
        rejected_at: timestamp,
        reviewer_id: input.reviewerId,
      }),
      timestamp,
    );
    return true;
  });

  if (!(await run())) return null;
  return getPaymentById(input.paymentId);
}

export async function getPaymentEvents(paymentId: string): Promise<PaymentEvent[]> {
  const rows = await allTurso<Row>(
    "SELECT * FROM payment_events WHERE payment_id = ? ORDER BY created_at ASC",
    [paymentId],
  );
  return rows
    .map(paymentEventFromRow)
    .filter((event): event is PaymentEvent => Boolean(event));
}

export async function getPaymentById(paymentId: string): Promise<PaymentWithDetails | null> {
  const row = await prepareTurso<Row>(
    `SELECT
      p.*,
      r.request_number AS req_request_number,
      r.certificate_type AS req_certificate_type,
      r.purpose AS req_purpose,
      r.status AS req_status,
      r.fee_amount AS req_fee_amount,
      r.payment_status AS req_payment_status,
      r.date_requested AS req_date_requested,
      r.date_accepted AS req_date_accepted,
      r.resident_id AS req_resident_id,
      res.full_name AS res_full_name,
      res.email AS res_email,
      res.contact_number AS res_contact_number,
      res.address_sitio AS res_address_sitio,
      rev.full_name AS rev_full_name,
      rev.email AS rev_email,
      rev.role AS rev_role
    FROM payments p
    LEFT JOIN certificate_requests r ON r.id = p.request_id
    LEFT JOIN profiles res ON res.id = p.resident_id
    LEFT JOIN profiles rev ON rev.id = p.reviewed_by
    WHERE p.id = ?`,
    [paymentId],
  );

  if (!row) return null;
  const payment = paymentFromRow(row);
  if (!payment) return null;

  const events = await getPaymentEvents(paymentId);

  const request: CertificateRequest | undefined = row.req_request_number
    ? {
        cancelled_at: null,
        certificate_type: String(row.req_certificate_type) as CertificateType,
        control_number: null,
        created_at: String(row.created_at),
        date_accepted: asText(row.req_date_accepted),
        date_released: null,
        date_requested: String(row.req_date_requested),
        fee_amount: asNumber(row.req_fee_amount),
        id: String(row.request_id),
        payment_status: String(row.req_payment_status) as PaymentStatus,
        purpose: String(row.req_purpose),
        remarks: null,
        request_number: String(row.req_request_number),
        resident_id: String(row.req_resident_id),
        status: String(row.req_status) as RequestStatus,
        submitted_data: null,
        updated_at: String(row.updated_at),
      }
    : undefined;

  const resident: Profile | undefined = row.res_full_name
    ? {
        address_sitio: asText(row.res_address_sitio),
        age: null,
        auth_user_id: null,
        civil_status: null,
        contact_number: asText(row.res_contact_number),
        created_at: String(row.created_at),
        date_of_birth: null,
        email: String(row.res_email),
        full_name: String(row.res_full_name),
        gender: null,
        id: String(row.resident_id),
        occupation: null,
        password_hash: null,
        role: "resident",
        updated_at: String(row.updated_at),
        username: null,
      }
    : undefined;

  const reviewer: Profile | null = row.rev_full_name
    ? {
        address_sitio: null,
        age: null,
        auth_user_id: null,
        civil_status: null,
        contact_number: null,
        created_at: String(row.created_at),
        date_of_birth: null,
        email: String(row.rev_email),
        full_name: String(row.rev_full_name),
        gender: null,
        id: String(row.reviewed_by),
        occupation: null,
        password_hash: null,
        role: String(row.rev_role) as ProfileRole,
        updated_at: String(row.updated_at),
        username: null,
      }
    : null;

  return {
    ...payment,
    events,
    request,
    resident,
    reviewer,
  };
}

export async function listPaymentsForVerification(
  statusFilter?: PaymentRecordStatus | "all",
): Promise<PaymentWithDetails[]> {
  const filterClause =
    statusFilter && statusFilter !== "all" ? "WHERE p.status = ?" : "";
  const params = statusFilter && statusFilter !== "all" ? [statusFilter] : [];

  const rows = await allTurso<Row>(
    `SELECT
      p.*,
      r.request_number AS req_request_number,
      r.certificate_type AS req_certificate_type,
      r.purpose AS req_purpose,
      r.status AS req_status,
      r.fee_amount AS req_fee_amount,
      r.payment_status AS req_payment_status,
      r.date_requested AS req_date_requested,
      r.date_accepted AS req_date_accepted,
      r.resident_id AS req_resident_id,
      res.full_name AS res_full_name,
      res.email AS res_email,
      res.contact_number AS res_contact_number,
      res.address_sitio AS res_address_sitio,
      rev.full_name AS rev_full_name,
      rev.email AS rev_email,
      rev.role AS rev_role
    FROM payments p
    LEFT JOIN certificate_requests r ON r.id = p.request_id
    LEFT JOIN profiles res ON res.id = p.resident_id
    LEFT JOIN profiles rev ON rev.id = p.reviewed_by
    ${filterClause}
    ORDER BY
      CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END,
      p.created_at DESC`,
    params,
  );

  return rows.map((row) => {
    const payment = paymentFromRow(row)!;
    const request: CertificateRequest | undefined = row.req_request_number
      ? {
          cancelled_at: null,
          certificate_type: String(row.req_certificate_type) as CertificateType,
          control_number: null,
          created_at: String(row.created_at),
          date_accepted: asText(row.req_date_accepted),
          date_released: null,
          date_requested: String(row.req_date_requested),
          fee_amount: asNumber(row.req_fee_amount),
          id: String(row.request_id),
          payment_status: String(row.req_payment_status) as PaymentStatus,
          purpose: String(row.req_purpose),
          remarks: null,
          request_number: String(row.req_request_number),
          resident_id: String(row.req_resident_id),
          status: String(row.req_status) as RequestStatus,
          submitted_data: null,
          updated_at: String(row.updated_at),
        }
      : undefined;

    const resident: Profile | undefined = row.res_full_name
      ? {
          address_sitio: asText(row.res_address_sitio),
          age: null,
          auth_user_id: null,
          civil_status: null,
          contact_number: asText(row.res_contact_number),
          created_at: String(row.created_at),
          date_of_birth: null,
          email: String(row.res_email),
          full_name: String(row.res_full_name),
          gender: null,
          id: String(row.resident_id),
          occupation: null,
          password_hash: null,
          role: "resident",
          updated_at: String(row.updated_at),
          username: null,
        }
      : undefined;

    const reviewer: Profile | null = row.rev_full_name
      ? {
          address_sitio: null,
          age: null,
          auth_user_id: null,
          civil_status: null,
          contact_number: null,
          created_at: String(row.created_at),
          date_of_birth: null,
          email: String(row.rev_email),
          full_name: String(row.rev_full_name),
          gender: null,
          id: String(row.reviewed_by),
          occupation: null,
          password_hash: null,
          role: String(row.rev_role) as ProfileRole,
          updated_at: String(row.updated_at),
          username: null,
        }
      : null;

    return {
      ...payment,
      request,
      resident,
      reviewer,
    };
  });
}

export async function countPendingPayments(): Promise<number> {
  const row = await prepareTurso<{ count: number }>(
    "SELECT COUNT(*) AS count FROM payments WHERE status = 'pending'",
  );
  return row ? Number(row.count) : 0;
}

export async function updatePaymentReceivingConfig(
  provider: "gcash" | "maya",
  config: PaymentMethodConfig,
) {
  await setSystemSetting(`payment_receiving_${provider}`, config as unknown as Json);
}

export async function cancelRequest(id: string, residentId: string) {
  await runTurso(
    `UPDATE certificate_requests
     SET status = 'cancelled', cancelled_at = ?, updated_at = ?
     WHERE id = ? AND resident_id = ? AND status = 'pending'`,
    [nowIso(), nowIso(), id, residentId],
  );
  return getResidentRequestById(id, residentId);
}

export async function resubmitRejectedRequest(input: {
  age: number;
  birthdate?: string | null;
  contact_number: string;
  full_name: string;
  id: string;
  place_of_birth?: string | null;
  purpose: string;
  resident_id: string;
  sitio?: string | null;
  years_of_residency?: number | null;
}) {
  if (input.purpose.trim().length > CERTIFICATE_PURPOSE_MAX_LENGTH) return null;
  const existing = await getResidentRequestById(input.id, input.resident_id);
  if (!existing || existing.status !== "rejected") return null;
  const submittedData: Json = {
    certificate_specific: {
      birthdate: input.birthdate || null,
      place_of_birth: input.place_of_birth || null,
      years_of_residency: input.years_of_residency ?? null,
    },
    common: {
      address_sitio: input.sitio || null,
      age: input.age,
      contact_number: input.contact_number,
      date_requested: nowIso(),
      full_name: input.full_name,
      purpose: input.purpose.trim(),
    },
  };
  const timestamp = nowIso();
  await runTurso(
    `UPDATE certificate_requests
     SET purpose = ?, status = 'pending', remarks = NULL, submitted_data = ?,
         date_requested = ?, date_accepted = NULL, updated_at = ?
     WHERE id = ? AND resident_id = ?`,
    [input.purpose.trim(), stringifyJson(submittedData), timestamp, timestamp, input.id, input.resident_id],
  );
  return getResidentRequestById(input.id, input.resident_id);
}

export async function upsertPickupSchedule(input: {
  created_by: string;
  pickup_date: string;
  pickup_time: string;
  remarks?: string | null;
  request_id: string;
}) {
  const timestamp = nowIso();
  const existing = await prepareTurso<Row>("SELECT id FROM pickup_schedules WHERE request_id = ?", [input.request_id]);
  if (existing) {
    await runTurso(
      `UPDATE pickup_schedules
       SET pickup_date = ?, pickup_time = ?, remarks = ?, created_by = ?, updated_at = ?
       WHERE request_id = ?`,
      [input.pickup_date, input.pickup_time, input.remarks || null, input.created_by, timestamp, input.request_id],
    );
  } else {
    await runTurso(
      `INSERT INTO pickup_schedules (id, request_id, pickup_date, pickup_time, remarks, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), input.request_id, input.pickup_date, input.pickup_time, input.remarks || null, input.created_by, timestamp, timestamp],
    );
  }
  return (await getSchedulesForRequest(input.request_id))[0] ?? null;
}

export async function listPickupSchedules() {
  const rows = await allTurso<Row>("SELECT * FROM pickup_schedules ORDER BY pickup_date ASC, pickup_time ASC");
  const schedules = rows.map(scheduleFromRow).filter((row): row is PickupSchedule => Boolean(row));
  return Promise.all(
    schedules.map(async (schedule): Promise<ScheduleWithRequest> => ({
      ...schedule,
      request: await getRequestById(schedule.request_id),
    })),
  );
}

export async function listSchedulableRequests() {
  return (await listAllRequests()).filter((request) => request.status === "accepted");
}

export async function listResidents() {
  const rows = await allTurso<Row>("SELECT * FROM profiles WHERE role = 'resident' ORDER BY created_at DESC");
  return rows.map(profileFromRow).filter((row): row is Profile => Boolean(row));
}

export function listResidentHistory(residentId: string) {
  return listResidentRequests(residentId);
}

export async function persistIssuedCertificate(input: {
  certificate_number: string;
  certificate_record_id: string;
  current_request_status: RequestStatus;
  date_issued: string;
  issued_at: string;
  issuance_mode: CertificateRecord["issuance_mode"];
  next_request_status: RequestStatus;
  pdf_path: string | null;
  pdf_storage_key?: string | null;
  pdf_storage_provider?: "local" | "vercel_blob";
  pdf_sha256: string;
  prepared_by: string;
  request: CertificateRequest;
  certificate_snapshot: CertificateSnapshot;
  short_verification_code: string;
  template_data: Json;
  token_hash: string;
  verification_expires_at: string;
  verification_status: "expired" | "valid";
}) {
  const db = getTursoDb();
  const run = db.transactionAsync(async (tx) => {
    const active = await tx.get(
      "SELECT id FROM certificate_records WHERE request_id = ? AND status = 'issued'",
      input.request.id,
    );
    if (active) throw new Error("CERTIFICATE_ALREADY_ISSUED");
    const requestRow = (await tx.get(
      "SELECT resident_id, status, payment_status FROM certificate_requests WHERE id = ?",
      input.request.id,
    )) as { payment_status: string; resident_id: string; status: string } | undefined;
    if (!requestRow) throw new Error("CERTIFICATE_REQUEST_MISSING");
    if (
      requestRow.status !== input.current_request_status ||
      (input.issuance_mode === "fully_online_demo" &&
        !["paid", "free"].includes(requestRow.payment_status))
    ) {
      throw new Error("CERTIFICATE_REQUEST_NOT_ELIGIBLE");
    }
    const issuer = (await tx.get("SELECT role FROM profiles WHERE id = ?", input.prepared_by)) as { role: string } | undefined;
    if (!issuer || !["main_admin", "barangay_secretary"].includes(issuer.role)) throw new Error("CERTIFICATE_ISSUER_NOT_AUTHORIZED");
    if (input.issuance_mode === "fully_online_demo" && requestRow.payment_status === "paid") {
      const successfulPayment = await tx.get(
        "SELECT id FROM payments WHERE request_id = ? AND resident_id = ? AND status = 'paid' LIMIT 1",
        input.request.id,
        input.request.resident_id,
      );
      if (!successfulPayment) throw new Error("CERTIFICATE_PAYMENT_NOT_SETTLED");
    }
    const timestamp = nowIso();
    await tx.run(
      `INSERT INTO certificate_records (
        id, request_id, certificate_type, resident_id, date_issued, prepared_by,
        control_number, template_data, pdf_path, pdf_storage_provider, pdf_storage_key,
        certificate_number, status, issuance_mode, issued_at, issued_by,
        certificate_snapshot, pdf_sha256, verification_expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?)`,
      input.certificate_record_id,
      input.request.id,
      input.request.certificate_type,
      input.request.resident_id,
      input.date_issued,
      input.prepared_by,
      input.request.control_number,
      stringifyJson(input.template_data),
      input.pdf_path,
      input.pdf_storage_provider ?? "local",
      input.pdf_storage_key ?? null,
      input.certificate_number,
      input.issuance_mode,
      input.issued_at,
      input.prepared_by,
      stringifyJson(input.certificate_snapshot),
      input.pdf_sha256,
      input.verification_expires_at,
      timestamp,
    );
    await tx.run(
      `INSERT INTO certificate_verifications (
        id, certificate_record_id, token_hash, short_verification_code, status,
        valid_from, expires_at, revoked_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      randomUUID(),
      input.certificate_record_id,
      input.token_hash,
      input.short_verification_code,
      input.verification_status,
      input.issued_at,
      input.verification_expires_at,
      timestamp,
      timestamp,
    );
    const requestUpdate = await tx.run(
      "UPDATE certificate_requests SET status = ?, updated_at = ? WHERE id = ? AND status = ?",
      input.next_request_status,
      timestamp,
      input.request.id,
      input.current_request_status,
    );
    if (rowsAffected(requestUpdate) !== 1) throw new Error("CERTIFICATE_REQUEST_STATE_CHANGED");
    const reservationUpdate = await tx.run(
      "UPDATE issuance_reservations SET status = 'finalized', finalized_at = ? WHERE certificate_record_id = ? AND status = 'reserved'",
      timestamp,
      input.certificate_record_id,
    );
    if (rowsAffected(reservationUpdate) !== 1) {
      throw new Error("CERTIFICATE_ISSUANCE_RESERVATION_FAILED");
    }
    const revokedRecord = (await tx.get(
      "SELECT id FROM certificate_records WHERE request_id = ? AND status = 'revoked' ORDER BY issued_at DESC LIMIT 1",
      input.request.id,
    )) as { id: string } | undefined;
    if (revokedRecord) {
      await tx.run("UPDATE certificate_records SET replacement_record_id = ? WHERE id = ?", input.certificate_record_id, revokedRecord.id);
    }
  });
  await run();
  return getCertificateRecordById(input.certificate_record_id);
}

export async function getCertificateRecordByRequestId(requestId: string) {
  return certificateRecordFromRow(
    await prepareTurso<Row>(
      "SELECT * FROM certificate_records WHERE request_id = ? ORDER BY issued_at DESC LIMIT 1",
      [requestId],
    ),
  );
}
export async function getCertificateRecordsByRequestIds(
  requestIds: string[],
): Promise<Map<string, CertificateRecord>> {
  if (requestIds.length === 0) return new Map();
  const placeholders = requestIds.map(() => "?").join(", ");
  const rows = await allTurso<Row>(
    `SELECT * FROM certificate_records WHERE request_id IN (${placeholders}) ORDER BY issued_at DESC`,
    requestIds,
  );
  const map = new Map<string, CertificateRecord>();
  for (const row of rows) {
    const record = certificateRecordFromRow(row);
    if (record && !map.has(record.request_id)) {
      map.set(record.request_id, record);
    }
  }
  return map;
}


export async function getIssuedCertificateRecordByRequestId(requestId: string) {
  return certificateRecordFromRow(
    await prepareTurso<Row>(
      "SELECT * FROM certificate_records WHERE request_id = ? AND status = 'issued' ORDER BY issued_at DESC LIMIT 1",
      [requestId],
    ),
  );
}

export async function getCertificateRecordById(id: string) {
  return certificateRecordFromRow(await prepareTurso<Row>("SELECT * FROM certificate_records WHERE id = ?", [id]));
}

export async function revokeCertificateRecord(input: { id: string; reason: string; revokedBy: string }) {
  const timestamp = nowIso();
  const run = getTursoDb().transactionAsync(async (tx) => {
    const result = await tx.run(
      `UPDATE certificate_records
       SET status = 'revoked', revoked_at = ?, revoked_by = ?, revocation_reason = ?
       WHERE id = ? AND status = 'issued'`,
      timestamp,
      input.revokedBy,
      input.reason,
      input.id,
    );
    if (rowsAffected(result) === 0) return false;
    const verificationResult = await tx.run(
      `UPDATE certificate_verifications SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE certificate_record_id = ?`,
      timestamp,
      timestamp,
      input.id,
    );
    if (rowsAffected(verificationResult) !== 1) throw new Error("CERTIFICATE_VERIFICATION_STATE_FAILED");
    await tx.run(
      "UPDATE issuance_reservations SET status = 'released', released_at = ? WHERE certificate_record_id = ? AND status = 'finalized'",
      timestamp,
      input.id,
    );
    return true;
  });
  return run();
}

export async function listResidentCertificateRecords(residentId: string) {
  const rows = await allTurso<Row>(
    "SELECT * FROM certificate_records WHERE resident_id = ? AND status <> 'draft' ORDER BY issued_at DESC",
    [residentId],
  );
  return rows.map(certificateRecordFromRow).filter((row): row is CertificateRecord => Boolean(row));
}

export async function createCertificateDownloadLog(
  certificateRecordId: string,
  userId: string,
  result: CertificateDownloadResult,
) {
  await runTurso(
    "INSERT INTO certificate_download_logs (id, certificate_record_id, user_id, result, downloaded_at) VALUES (?, ?, ?, ?, ?)",
    [randomUUID(), certificateRecordId, userId, result, nowIso()],
  );
}

export function generateVerificationToken() {
  return randomBytes(32).toString("base64url");
}

export async function createCertificateVerification(input: {
  certificateRecordId: string;
  issuedAt: string;
  token: string;
}) {
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const expiresAt = new Date(new Date(input.issuedAt).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const timestamp = nowIso();
  const shortCode = `BB-${randomBytes(4).toString("hex").toUpperCase()}`;
  await runTurso(
    `INSERT INTO certificate_verifications (id, certificate_record_id, token_hash, short_verification_code, status, valid_from, expires_at, revoked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'valid', ?, ?, NULL, ?, ?)`,
    [randomUUID(), input.certificateRecordId, tokenHash, shortCode, input.issuedAt, expiresAt, timestamp, timestamp],
  );
  return { expiresAt, shortCode };
}

export async function getCertificateVerificationByToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prepareTurso<Row>(
    `SELECT v.*, c.certificate_number, c.certificate_type, c.date_issued, c.status AS certificate_status,
            c.pdf_sha256, c.certificate_snapshot, c.replacement_record_id
     FROM certificate_verifications v
      JOIN certificate_records c ON c.id = v.certificate_record_id
      WHERE v.token_hash = ?`,
    [tokenHash],
  );
  if (!row) return null;
  const rawSnapshot = parseJson(row.certificate_snapshot);
  const snapshot = rawSnapshot && typeof rawSnapshot === "object" && !Array.isArray(rawSnapshot) ? (rawSnapshot as Record<string, unknown>) : {};
  const snapshotText = (key: string, fallback: string) => typeof snapshot[key] === "string" && snapshot[key] ? String(snapshot[key]) : fallback;
  const expiresAt = String(row.expires_at);
  const revoked = row.revoked_at !== null || row.certificate_status === "revoked";
  const expired = row.status === "expired" || isVerificationExpired(expiresAt);
  const replacementRecordId = asText(row.replacement_record_id);
  return {
    certificateNumber: snapshotText("certificate_number", String(row.certificate_number)),
    certificateType: snapshotText("certificate_type", String(row.certificate_type)) as CertificateType,
    dateIssued: snapshotText("date_issued", String(row.date_issued)),
    expiresAt,
    fullName: snapshotText("holder_full_name", "Unavailable"),
    pdfSha256: asText(row.pdf_sha256),
    replacementRecordId,
    shortCode: String(row.short_verification_code),
    status: replacementRecordId ? "replaced" : revoked ? "revoked" : expired ? "expired" : "valid",
  } as const;
}

export async function getCertificateVerificationByShortCode(rawShortCode: string) {
  const normalized = rawShortCode.trim().toUpperCase();
  if (!/^BB-[0-9A-F]{8}$/.test(normalized)) {
    return null;
  }
  const row = await prepareTurso<Row>(
    `SELECT v.*, c.certificate_number, c.certificate_type, c.date_issued, c.status AS certificate_status,
            c.pdf_sha256, c.certificate_snapshot, c.replacement_record_id
     FROM certificate_verifications v
      JOIN certificate_records c ON c.id = v.certificate_record_id
      WHERE v.short_verification_code = ?`,
    [normalized],
  );
  if (!row) return null;
  const rawSnapshot = parseJson(row.certificate_snapshot);
  const snapshot =
    rawSnapshot && typeof rawSnapshot === "object" && !Array.isArray(rawSnapshot)
      ? (rawSnapshot as Record<string, unknown>)
      : {};
  const snapshotText = (key: string, fallback: string) =>
    typeof snapshot[key] === "string" && snapshot[key] ? String(snapshot[key]) : fallback;
  const expiresAt = String(row.expires_at);
  const revoked = row.revoked_at !== null || row.certificate_status === "revoked";
  const expired = row.status === "expired" || isVerificationExpired(expiresAt);
  const replacementRecordId = asText(row.replacement_record_id);
  return {
    certificateNumber: snapshotText("certificate_number", String(row.certificate_number)),
    certificateType: snapshotText("certificate_type", String(row.certificate_type)) as CertificateType,
    dateIssued: snapshotText("date_issued", String(row.date_issued)),
    expiresAt,
    fullName: snapshotText("holder_full_name", "Unavailable"),
    pdfSha256: asText(row.pdf_sha256),
    replacementRecordId,
    shortCode: String(row.short_verification_code),
    status: replacementRecordId ? "replaced" : revoked ? "revoked" : expired ? "expired" : "valid",
  } as const;
}

export async function createActivityLog(input: {
  action: string;
  affected_record_id?: string | null;
  affected_table?: string | null;
  profile: Profile;
  remarks?: string | null;
}) {
  await runTurso(
    `INSERT INTO activity_logs (id, user_id, role, action, affected_table, affected_record_id, remarks, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.profile.id, input.profile.role, input.action, input.affected_table || null, input.affected_record_id || null, input.remarks || null, nowIso()],
  );
}

export async function listActivityLogs() {
  const rows = await allTurso<Row>(
    `SELECT a.*, p.full_name AS user_full_name, p.email AS user_email
     FROM activity_logs a
     LEFT JOIN profiles p ON p.id = a.user_id
     ORDER BY a.created_at DESC`,
  );
  return rows.map((log): ActivityLogWithUser => {
    const userEmail = asText(log.user_email);
    const userFullName = asText(log.user_full_name);
    return {
      action: String(log.action),
      affected_record_id: asText(log.affected_record_id),
      affected_table: asText(log.affected_table),
      created_at: String(log.created_at),
      id: String(log.id),
      remarks: asText(log.remarks),
      role: String(log.role),
      user: userEmail && userFullName ? { email: userEmail, full_name: userFullName } : null,
      user_id: asText(log.user_id),
    };
  });
}

export async function createNotificationLog(input: {
  message: string;
  provider_response?: Json | null;
  recipient_email: string;
  request_id?: string | null;
  status: string;
  subject: string;
}) {
  await runTurso(
    `INSERT INTO notification_logs (id, request_id, recipient_email, subject, message, status, provider_response, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.request_id || null, input.recipient_email, input.subject, input.message, input.status, stringifyJson(input.provider_response ?? null), nowIso()],
  );
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const rows = await allTurso<Row>("SELECT * FROM system_settings");
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
  const paymentReceiving = applyDemoPaymentFallback(
    {
      gcash: parsePaymentMethodConfig(settings.get("payment_receiving_gcash")?.value),
      maya: parsePaymentMethodConfig(settings.get("payment_receiving_maya")?.value),
    },
    env.paymentDemoMode,
  );

  return {
    barangayCaptainName:
      (settings.get("barangay_captain_name")?.value as string | undefined) ??
      "Authorized Barangay Official",
    paymentReceiving,
    signatureImagePath:
      (settings.get("signature_image_path")?.value as string | undefined) ?? null,
    signatureImageProvider:
      (settings.get("signature_image_provider")?.value as
        | "local"
        | "vercel_blob"
        | undefined) ?? env.certificateStorageProvider,
    signatureImageSha256:
      (settings.get("signature_image_sha256")?.value as string | undefined) ?? null,
    signatureImageUpdatedAt:
      (settings.get("signature_image_updated_at")?.value as string | undefined) ?? null,
  };
}

export async function setSystemSetting(key: string, value: Json) {
  const timestamp = nowIso();
  await runTurso(
    `INSERT INTO system_settings (id, key, value, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [randomUUID(), key, stringifyJson(value), timestamp, timestamp],
  );
}

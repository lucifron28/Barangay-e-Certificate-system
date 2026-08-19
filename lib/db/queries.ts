import "server-only";

import { randomBytes } from "node:crypto";
import { getDatabaseProvider } from "@/lib/db/provider";
import type * as sqlite from "@/lib/db/sqlite/queries";
import type * as turso from "@/lib/db/turso/queries";

export type RequestWithResident = sqlite.RequestWithResident;
export type ScheduleWithRequest = sqlite.ScheduleWithRequest;
export type ActivityLogWithUser = sqlite.ActivityLogWithUser;
export type SystemSettings = sqlite.SystemSettings;
export type DashboardData = sqlite.DashboardData;
export type {
  PaymentWithDetails,
  PaymentMethodConfig,
  PaymentReceivingSettings,
} from "@/types/database";
export { DEFAULT_PAYMENT_RECEIVING_SETTINGS } from "@/lib/db/sqlite/queries";
function assertSupported() {
  if (getDatabaseProvider() === "supabase") {
    throw new Error("The provider-neutral repository is for SQLite and Turso mode.");
  }
}

async function loadProviderModule(): Promise<typeof sqlite | typeof turso> {
  assertSupported();
  return getDatabaseProvider() === "turso"
    ? import("@/lib/db/turso/queries")
    : import("@/lib/db/sqlite/queries");
}

export async function getProfileById(id: string) {
  return (await loadProviderModule()).getProfileById(id);
}

export async function createAuthSession(input: Parameters<typeof sqlite.createAuthSession>[0]) {
  return (await loadProviderModule()).createAuthSession(input);
}

export async function getAuthSessionProfileByTokenHash(tokenHash: string) {
  return (await loadProviderModule()).getAuthSessionProfileByTokenHash(tokenHash);
}

export async function touchAuthSession(tokenHash: string) {
  return (await loadProviderModule()).touchAuthSession(tokenHash);
}

export async function revokeAuthSession(tokenHash: string) {
  return (await loadProviderModule()).revokeAuthSession(tokenHash);
}

export async function findProfileByLogin(login: string) {
  return (await loadProviderModule()).findProfileByLogin(login);
}

export async function profileExists(email: string, username?: string | null) {
  return (await loadProviderModule()).profileExists(email, username);
}

export async function createProfile(input: Parameters<typeof sqlite.createProfile>[0]) {
  return (await loadProviderModule()).createProfile(input);
}

export async function updateProfile(
  id: string,
  input: Parameters<typeof sqlite.updateProfile>[1],
) {
  return (await loadProviderModule()).updateProfile(id, input);
}

export async function generateRequestNumber() {
  return (await loadProviderModule()).generateRequestNumber();
}

export async function generateClearanceControlNumber() {
  return (await loadProviderModule()).generateClearanceControlNumber();
}

export async function generateCertificateNumber() {
  return (await loadProviderModule()).generateCertificateNumber();
}

export async function allocateCertificateNumber() {
  return (await loadProviderModule()).allocateCertificateNumber();
}

export async function reserveCertificateIssuance(
  input: Parameters<typeof sqlite.reserveCertificateIssuance>[0],
) {
  return (await loadProviderModule()).reserveCertificateIssuance(input);
}

export async function finalizeCertificateIssuanceReservation(certificateRecordId: string) {
  return (await loadProviderModule()).finalizeCertificateIssuanceReservation(certificateRecordId);
}

export async function releaseCertificateIssuanceReservation(certificateRecordId: string) {
  return (await loadProviderModule()).releaseCertificateIssuanceReservation(certificateRecordId);
}

export async function createCertificateRequest(
  input: Parameters<typeof sqlite.createCertificateRequest>[0],
) {
  return (await loadProviderModule()).createCertificateRequest(input);
}

export async function listResidentRequests(residentId: string) {
  return (await loadProviderModule()).listResidentRequests(residentId);
}

export async function listAllRequests() {
  return (await loadProviderModule()).listAllRequests();
}
export async function getAdminDashboardData(monthPrefix?: string) {
  return (await loadProviderModule()).getAdminDashboardData(monthPrefix);
}

export async function getResidentDashboardData(residentId: string) {
  return (await loadProviderModule()).getResidentDashboardData(residentId);
}


export async function getRequestById(id: string) {
  return (await loadProviderModule()).getRequestById(id);
}

export async function getResidentRequestById(id: string, residentId: string) {
  return (await loadProviderModule()).getResidentRequestById(id, residentId);
}

export async function updateRequestStatus(
  input: Parameters<typeof sqlite.updateRequestStatus>[0],
) {
  return (await loadProviderModule()).updateRequestStatus(input);
}

export async function getLatestPaymentForRequest(requestId: string) {
  return (await loadProviderModule()).getLatestPaymentForRequest(requestId);
}

export async function listPaymentsForRequest(requestId: string) {
  return (await loadProviderModule()).listPaymentsForRequest(requestId);
}

export async function listNotificationLogsForRequest(requestId: string) {
  return (await loadProviderModule()).listNotificationLogsForRequest(requestId);
}

export async function hasSuccessfulPayment(requestId: string, residentId: string) {
  return (await loadProviderModule()).hasSuccessfulPayment(requestId, residentId);
}

export async function submitPaymentProof(
  input: Parameters<typeof sqlite.submitPaymentProof>[0],
) {
  return (await loadProviderModule()).submitPaymentProof(input);
}

export async function confirmPaymentProof(
  input: Parameters<typeof sqlite.confirmPaymentProof>[0],
) {
  return (await loadProviderModule()).confirmPaymentProof(input);
}

export async function rejectPaymentProof(
  input: Parameters<typeof sqlite.rejectPaymentProof>[0],
) {
  return (await loadProviderModule()).rejectPaymentProof(input);
}

export async function getPaymentById(paymentId: string) {
  return (await loadProviderModule()).getPaymentById(paymentId);
}

export async function listPaymentsForVerification(
  statusFilter?: Parameters<typeof sqlite.listPaymentsForVerification>[0],
) {
  return (await loadProviderModule()).listPaymentsForVerification(statusFilter);
}

export async function countPendingPayments() {
  return (await loadProviderModule()).countPendingPayments();
}

export async function getPaymentEvents(paymentId: string) {
  return (await loadProviderModule()).getPaymentEvents(paymentId);
}

export async function updatePaymentReceivingConfig(
  provider: Parameters<typeof sqlite.updatePaymentReceivingConfig>[0],
  config: Parameters<typeof sqlite.updatePaymentReceivingConfig>[1],
) {
  return (await loadProviderModule()).updatePaymentReceivingConfig(provider, config);
}

export async function cancelRequest(id: string, residentId: string) {
  return (await loadProviderModule()).cancelRequest(id, residentId);
}

export async function resubmitRejectedRequest(
  input: Parameters<typeof sqlite.resubmitRejectedRequest>[0],
) {
  return (await loadProviderModule()).resubmitRejectedRequest(input);
}

export async function upsertPickupSchedule(
  input: Parameters<typeof sqlite.upsertPickupSchedule>[0],
) {
  return (await loadProviderModule()).upsertPickupSchedule(input);
}

export async function listPickupSchedules() {
  return (await loadProviderModule()).listPickupSchedules();
}

export async function listSchedulableRequests() {
  return (await loadProviderModule()).listSchedulableRequests();
}

export async function listResidents() {
  return (await loadProviderModule()).listResidents();
}

export async function listResidentHistory(residentId: string) {
  return (await loadProviderModule()).listResidentHistory(residentId);
}

export async function persistIssuedCertificate(
  input: Parameters<typeof sqlite.persistIssuedCertificate>[0],
) {
  return (await loadProviderModule()).persistIssuedCertificate(input);
}

export async function getCertificateRecordByRequestId(requestId: string) {
  return (await loadProviderModule()).getCertificateRecordByRequestId(requestId);
}
export async function getCertificateRecordsByRequestIds(requestIds: string[]) {
  return (await loadProviderModule()).getCertificateRecordsByRequestIds(requestIds);
}


export async function getIssuedCertificateRecordByRequestId(requestId: string) {
  return (await loadProviderModule()).getIssuedCertificateRecordByRequestId(requestId);
}

export async function getCertificateRecordById(id: string) {
  return (await loadProviderModule()).getCertificateRecordById(id);
}

export async function revokeCertificateRecord(
  input: Parameters<typeof sqlite.revokeCertificateRecord>[0],
) {
  return (await loadProviderModule()).revokeCertificateRecord(input);
}

export async function listResidentCertificateRecords(residentId: string) {
  return (await loadProviderModule()).listResidentCertificateRecords(residentId);
}

export async function createCertificateDownloadLog(
  certificateRecordId: string,
  userId: string,
  result: Parameters<typeof sqlite.createCertificateDownloadLog>[2],
) {
  return (await loadProviderModule()).createCertificateDownloadLog(
    certificateRecordId,
    userId,
    result,
  );
}

export function generateVerificationToken() {
  return randomBytes(32).toString("base64url");
}

export async function createCertificateVerification(
  input: Parameters<typeof sqlite.createCertificateVerification>[0],
) {
  return (await loadProviderModule()).createCertificateVerification(input);
}

export async function getCertificateVerificationByToken(token: string) {
  return (await loadProviderModule()).getCertificateVerificationByToken(token);
}

export async function getCertificateVerificationByShortCode(shortCode: string) {
  return (await loadProviderModule()).getCertificateVerificationByShortCode(shortCode);
}

export async function createActivityLog(
  input: Parameters<typeof sqlite.createActivityLog>[0],
) {
  return (await loadProviderModule()).createActivityLog(input);
}

export async function listActivityLogs() {
  return (await loadProviderModule()).listActivityLogs();
}

export async function createNotificationLog(
  input: Parameters<typeof sqlite.createNotificationLog>[0],
) {
  return (await loadProviderModule()).createNotificationLog(input);
}

export async function getSystemSettings() {
  return (await loadProviderModule()).getSystemSettings();
}

export async function setSystemSetting(
  key: string,
  value: Parameters<typeof sqlite.setSystemSetting>[1],
) {
  return (await loadProviderModule()).setSystemSetting(key, value);
}

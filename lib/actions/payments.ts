"use server";

import { requireResident } from "@/lib/auth/guards";
import { redirectWithError, redirectWithMessage, logActivity } from "@/lib/actions/helpers";
import { isSqliteProvider } from "@/lib/db/provider";
import { isFullyOnlineDemo } from "@/lib/services/issuance-mode";
import {
  createMockPayment,
  getLatestPaymentForRequest,
  getResidentRequestById,
  listPaymentsForRequest,
  resolveMockPayment,
  updateRequestStatus,
} from "@/lib/db/sqlite/queries";

function paymentPath(requestId: string) {
  return `/resident/payments/${requestId}`;
}

export async function startMockPaymentAction(formData: FormData) {
  const context = await requireResident();
  const requestId = String(formData.get("request_id") ?? "");
  const path = paymentPath(requestId);
  if (!requestId || context.setupMissing || !isSqliteProvider() || !isFullyOnlineDemo) {
    redirectWithError(path, "Mock payment is available only in local demo mode.");
  }
  const request = getResidentRequestById(requestId, context.profile.id);
  if (!request || request.status !== "accepted" || request.payment_status !== "unpaid") {
    redirectWithError(path, "Only accepted unpaid requests can start mock payment.");
  }
  const payment = createMockPayment({ amount: request.fee_amount, request_id: request.id, resident_id: context.profile.id });
  if (!payment) redirectWithError(path, "Unable to start mock payment.");
  await logActivity({ action: "Payment initiated", affectedRecordId: payment.id, affectedTable: "payments", profile: context.profile, remarks: "Simulated payment initiated.", supabase: context.supabase });
  redirectWithMessage(path, "Demo payment started. No actual funds are transferred.");
}

export async function resolveMockPaymentAction(formData: FormData) {
  const context = await requireResident();
  const paymentId = String(formData.get("payment_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const path = paymentPath(requestId);
  if (!paymentId || !requestId || !["paid", "failed", "cancelled"].includes(outcome) || context.setupMissing || !isSqliteProvider()) {
    redirectWithError(path, "Unable to resolve mock payment.");
  }
  const payment = resolveMockPayment({ payment_id: paymentId, resident_id: context.profile.id, status: outcome as "paid" | "failed" | "cancelled" });
  if (!payment || payment.request_id !== requestId) redirectWithError(path, "Payment is no longer available.");
  if (payment.status === "paid") updateRequestStatus({ id: requestId, paymentStatus: "paid", status: "accepted" });
  await logActivity({ action: `Mock payment ${payment.status}`, affectedRecordId: payment.id, affectedTable: "payments", profile: context.profile, remarks: "DEMO PAYMENT - no actual funds transferred.", supabase: context.supabase });
  redirectWithMessage(path, payment.status === "paid" ? "Demo payment successful." : "Demo payment recorded.");
}

export async function getResidentDemoPayment(requestId: string) {
  const context = await requireResident();
  if (context.setupMissing || !isSqliteProvider()) return { context, payment: null, request: null };
  const request = getResidentRequestById(requestId, context.profile.id);
  return {
    context,
    payment: request ? getLatestPaymentForRequest(request.id) : null,
    payments: request ? listPaymentsForRequest(request.id) : [],
    request,
  };
}

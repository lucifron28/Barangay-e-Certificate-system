"use server";

import { requireResident } from "@/lib/auth/guards";
import { redirectWithError, redirectWithMessage, logActivity } from "@/lib/actions/helpers";
import { isSqliteProvider } from "@/lib/db/provider";
import {
  createMockPayment,
  getLatestPaymentForRequest,
  getResidentRequestById,
  listPaymentsForRequest,
  resolveMockPayment,
  updateRequestStatus,
} from "@/lib/db/queries";

function paymentPath(requestId: string) {
  return `/resident/payments/${requestId}`;
}

export async function startMockPaymentAction(formData: FormData) {
  const context = await requireResident();
  const requestId = String(formData.get("request_id") ?? "");
  const path = paymentPath(requestId);
  if (!requestId || context.setupMissing || !isSqliteProvider()) {
    redirectWithError(path, "Online payment simulation is not configured.");
  }
  const request = await getResidentRequestById(requestId, context.profile.id);
  if (!request || request.status !== "accepted" || request.payment_status !== "unpaid") {
    redirectWithError(path, "Only accepted unpaid requests can start simulated payment.");
  }
  const payment = await createMockPayment({ amount: request.fee_amount, request_id: request.id, resident_id: context.profile.id });
  if (!payment) redirectWithError(path, "Unable to start simulated payment.");
  await logActivity({ action: "Payment initiated", affectedRecordId: payment.id, affectedTable: "payments", profile: context.profile, remarks: "Simulated payment initiated.", supabase: context.supabase });
  redirectWithMessage(path, "Simulated payment started. No actual funds are transferred.");
}

export async function resolveMockPaymentAction(formData: FormData) {
  const context = await requireResident();
  const paymentId = String(formData.get("payment_id") ?? "");
  const requestId = String(formData.get("request_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const path = paymentPath(requestId);
  if (!paymentId || !requestId || !["paid", "failed", "cancelled"].includes(outcome) || context.setupMissing || !isSqliteProvider()) {
    redirectWithError(path, "Unable to resolve simulated payment.");
  }
  const payment = await resolveMockPayment({ payment_id: paymentId, resident_id: context.profile.id, status: outcome as "paid" | "failed" | "cancelled" });
  if (!payment || payment.request_id !== requestId) redirectWithError(path, "Payment is no longer available.");
  if (payment.status === "paid") await updateRequestStatus({ id: requestId, paymentStatus: "paid", status: "accepted" });
  await logActivity({ action: `Simulated payment ${payment.status}`, affectedRecordId: payment.id, affectedTable: "payments", profile: context.profile, remarks: "SIMULATED PAYMENT - no actual funds transferred.", supabase: context.supabase });
  redirectWithMessage(path, payment.status === "paid" ? "Simulated payment successful." : "Simulated payment recorded.");
}

export async function getResidentDemoPayment(requestId: string) {
  const context = await requireResident();
  if (context.setupMissing || !isSqliteProvider()) return { context, payment: null, request: null };
  const request = await getResidentRequestById(requestId, context.profile.id);
  return {
    context,
    payment: request ? await getLatestPaymentForRequest(request.id) : null,
    payments: request ? await listPaymentsForRequest(request.id) : [],
    request,
  };
}

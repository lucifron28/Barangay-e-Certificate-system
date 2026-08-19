"use server";

import { requireResident } from "@/lib/auth/guards";
import { logActivity, redirectWithError, redirectWithMessage } from "@/lib/actions/helpers";
import { isSqliteProvider } from "@/lib/db/provider";
import {
  getLatestPaymentForRequest,
  getPaymentEvents,
  getResidentRequestById,
  getSystemSettings,
  listPaymentsForRequest,
  submitPaymentProof,
} from "@/lib/db/queries";
import {
  deletePrivatePaymentFile,
  detectImageFormat,
  MAX_PAYMENT_FILE_BYTES,
  storePaymentProofImage,
} from "@/lib/payments/storage";
import type { PaymentProvider } from "@/types/enums";

function paymentPath(requestId: string) {
  return `/resident/payments/${requestId}`;
}

export async function submitPaymentProofAction(formData: FormData) {
  const context = await requireResident();
  const requestId = String(formData.get("request_id") ?? "");
  const path = paymentPath(requestId);

  if (!requestId || context.setupMissing || !isSqliteProvider()) {
    redirectWithError(path, "Online payment is not configured.");
  }

  const provider = String(formData.get("provider") ?? "") as PaymentProvider;
  if (provider !== "gcash" && provider !== "maya") {
    redirectWithError(path, "Please select a valid payment method (GCash or Maya).");
  }

  const referenceNumber = String(formData.get("reference_number") ?? "").trim();
  if (!referenceNumber || referenceNumber.length < 4 || referenceNumber.length > 50) {
    redirectWithError(
      path,
      "Please provide a valid transaction reference number (4-50 characters).",
    );
  }

  const transactionDatetime = String(formData.get("transaction_datetime") ?? "").trim();
  if (!transactionDatetime || Number.isNaN(new Date(transactionDatetime).getTime())) {
    redirectWithError(path, "Please provide a valid transaction date and time.");
  }

  const proofFile = formData.get("proof_image") as File | null;
  if (!proofFile || proofFile.size === 0) {
    redirectWithError(path, "Please upload a payment screenshot as proof of payment.");
  }

  if (proofFile.size > MAX_PAYMENT_FILE_BYTES) {
    redirectWithError(path, "Payment screenshot must be 5 MB or smaller.");
  }

  const request = await getResidentRequestById(requestId, context.profile.id);
  if (!request || request.status !== "accepted" || request.payment_status !== "unpaid") {
    redirectWithError(
      path,
      "Only accepted unpaid requests can submit payment proof.",
    );
  }

  if (request.fee_amount <= 0) {
    redirectWithError(path, "This certificate is free and does not require payment.");
  }
  const previousPayment = await getLatestPaymentForRequest(request.id);
  const isResubmission = previousPayment?.status === "failed";

  const settings = await getSystemSettings();
  const paymentConfig = settings.paymentReceiving[provider];
  if (!paymentConfig?.enabled) {
    redirectWithError(
      path,
      `Online payment via ${provider.toUpperCase()} is currently unavailable.`,
    );
  }

  const bytes = new Uint8Array(await proofFile.arrayBuffer());
  const format = detectImageFormat(bytes);
  if (!format) {
    redirectWithError(
      path,
      "Payment proof must be a valid image file (JPEG, PNG, or WebP). PDFs and other documents are not accepted.",
    );
  }

  let storedFile;
  try {
    storedFile = await storePaymentProofImage(bytes, format);
  } catch (error) {
    redirectWithError(
      path,
      `Failed to store payment proof: ${error instanceof Error ? error.message : "Storage error"}`,
    );
  }

  let payment;
  try {
    payment = await submitPaymentProof({
      proofSha256: storedFile.sha256,
      proofStorageKey: storedFile.key,
      proofStorageProvider: storedFile.provider,
      provider,
      referenceNumber,
      requestId: request.id,
      residentId: context.profile.id,
      transactionDatetime,
    });
  } catch (error) {
    try {
      await deletePrivatePaymentFile({
        key: storedFile.key,
        provider: storedFile.provider,
      });
    } catch {
      // Best effort cleanup
    }
    redirectWithError(
      path,
      error instanceof Error
        ? error.message
        : "Failed to submit payment proof. Please try again.",
    );
  }

  if (!payment) {
    try {
      await deletePrivatePaymentFile({
        key: storedFile.key,
        provider: storedFile.provider,
      });
    } catch {
      // Best effort cleanup
    }
    redirectWithError(path, "Unable to record payment proof.");
  }

  await logActivity({
    action: isResubmission ? "Payment proof resubmitted" : "Payment proof submitted",
    affectedRecordId: payment.id,
    affectedTable: "payments",
    profile: context.profile,
    remarks: isResubmission
      ? `Resubmitted ${provider.toUpperCase()} payment reference ${referenceNumber} for verification.`
      : `Submitted ${provider.toUpperCase()} payment reference ${referenceNumber} for verification.`,
    supabase: context.supabase,
  });
  redirectWithMessage(
    path,
    "Your payment proof was submitted successfully. Barangay staff will verify the transaction before certificate issuance.",
  );
}

export async function getResidentPaymentData(requestId: string) {
  const context = await requireResident();
  if (context.setupMissing || !isSqliteProvider()) {
    return {
      context,
      events: [],
      latestPayment: null,
      payments: [],
      request: null,
      settings: null,
    };
  }

  const request = await getResidentRequestById(requestId, context.profile.id);
  const latestPayment = request ? await getLatestPaymentForRequest(request.id) : null;
  const payments = request ? await listPaymentsForRequest(request.id) : [];
  const events = latestPayment ? await getPaymentEvents(latestPayment.id) : [];
  const settings = await getSystemSettings();

  return {
    context,
    events,
    latestPayment,
    payments,
    request,
    settings,
  };
}

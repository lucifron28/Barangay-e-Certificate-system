"use server";

import { requireAdmin, requireMainAdmin } from "@/lib/auth/guards";
import { getSystemSettings } from "@/lib/services/certificate-data";
import {
  firstZodError,
  logActivity,
  redirectWithError,
  redirectWithMessage,
} from "@/lib/actions/helpers";
import { isSqliteProvider } from "@/lib/db/provider";
import {
  confirmPaymentProof,
  createNotificationLog,
  getCertificateRecordById,
  getPaymentById,
  getSystemSettings as getSystemSettingsDirect,
  rejectPaymentProof,
  revokeCertificateRecord,
  setSystemSetting,
  updatePaymentReceivingConfig,
  updateRequestStatus,
} from "@/lib/db/queries";
import {
  computeSha256,
  detectImageFormat,
  MAX_PAYMENT_FILE_BYTES,
  readPrivatePaymentFile,
  storeMerchantQrImage,
} from "@/lib/payments/storage";
import {
  detectSignatureImageFormat,
  MAX_SIGNATURE_IMAGE_BYTES,
  storeSignatureImage,
} from "@/lib/certificates/signature-storage";
import { sendEmailNotification } from "@/lib/email/send-email-notification";
import { canRejectRequest } from "@/lib/services/business-rules";
import { getAdminRequest } from "@/lib/services/certificate-data";
import {
  acceptRequestSchema,
  rejectRequestSchema,
  revokeCertificateSchema,
  saveCertificateSchema,
  systemSettingsSchema,
} from "@/lib/validations/admin";
import { certificateLabel } from "@/lib/utils/format";
import type { Json } from "@/types/database";
import {
  CertificateIssuanceError,
  issueCertificate,
} from "@/lib/services/certificate-issuance";
import { getCertificateDeliveryCopy } from "@/lib/services/issuance-mode";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";

async function getAdminContextOrRedirect(path: string) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    redirectWithError(path, "This service is temporarily unavailable.");
  }

  return context;
}

function acceptedEmail(residentName: string, certificateType: string) {
  const delivery = getCertificateDeliveryCopy();
  return {
    message: `Dear ${residentName},

Good day.

Your request for ${certificateType} has been accepted by Barangay Bato. Your submitted information has been reviewed and your certificate request will now proceed for processing.

${delivery.emailDelivery}

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: "Certificate Request Accepted",
  };
}

function rejectedEmail(
  residentName: string,
  certificateType: string,
  remarks: string,
) {
  return {
    message: `Dear ${residentName},

Good day.

We regret to inform you that your request for ${certificateType} has been rejected.

Reason/Remarks: ${remarks}

For further clarification, please contact Barangay Bato through the e-Certificate System.

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: "Certificate Request Rejected",
  };
}

function certificateReadyEmail(residentName: string, certificateType: string) {
  return {
    message: `Dear ${residentName},

Good day.

Your ${certificateType} is now ready as a secure PDF download.

Please sign in to My Certificates to download the issued PDF.

${getCertificateDeliveryCopy().emailDelivery}

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: "Certificate Ready for Download",
  };
}

async function notifyAndLog(input: {
  message: string;
  requestId: string;
  subject: string;
  supabase: Awaited<ReturnType<typeof getAdminContextOrRedirect>>["supabase"];
  to: string | null | undefined;
}) {
  if (!input.to) {
    return;
  }

  const result = await sendEmailNotification({
    message: input.message,
    subject: input.subject,
    to: input.to,
  });

  if (isSqliteProvider()) {
    await createNotificationLog({
      message: input.message,
      provider_response: result.providerResponse as Json,
      recipient_email: input.to,
      request_id: input.requestId,
      status: result.status,
      subject: input.subject,
    });
    return;
  }

  await input.supabase!.from("notification_logs").insert({
    message: input.message,
    provider_response: result.providerResponse as Json,
    recipient_email: input.to,
    request_id: input.requestId,
    status: result.status,
    subject: input.subject,
  });
}

export async function acceptRequestAction(formData: FormData) {
  const parsed = acceptRequestSchema.safeParse({
    remarks: formData.get("remarks"),
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const path = `/admin/certificate-requests/${parsed.data.request_id}`;
  const context = await getAdminContextOrRedirect(path);
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request) {
    redirectWithError("/admin/certificate-requests", "Request not found.");
  }

  if (request.status !== "pending") {
    redirectWithError(path, "Only pending requests can be accepted.");
  }

  if (isSqliteProvider()) {
    await updateRequestStatus({
      dateAccepted: new Date().toISOString(),
      id: request.id,
      remarks: parsed.data.remarks || "Request accepted.",
      status: "accepted",
    });
  } else {
    const { error } = await context.supabase!
      .from("certificate_requests")
      .update({
        date_accepted: new Date().toISOString(),
        remarks: parsed.data.remarks || null,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (error) {
      redirectWithError(path, "Unable to accept request.");
    }
  }

  await logActivity({
    action: "Approved certificate request",
    affectedRecordId: request.id,
    affectedTable: "certificate_requests",
    profile: context.profile,
    remarks: parsed.data.remarks || "Request accepted after information review.",
    supabase: context.supabase,
  });

  const email = acceptedEmail(
    request.resident?.full_name ?? "Resident",
    certificateLabel(request.certificate_type),
  );

  await notifyAndLog({
    ...email,
    requestId: request.id,
    supabase: context.supabase,
    to: request.resident?.email,
  });

  redirectWithMessage(path, "Request accepted.");
}

export async function rejectRequestAction(formData: FormData) {
  const parsed = rejectRequestSchema.safeParse({
    remarks: formData.get("remarks"),
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const path = `/admin/certificate-requests/${parsed.data.request_id}`;
  const context = await getAdminContextOrRedirect(path);
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request) {
    redirectWithError("/admin/certificate-requests", "Request not found.");
  }

  if (!canRejectRequest(request.status)) {
    redirectWithError(path, "Accepted or completed requests cannot be rejected.");
  }

  if (isSqliteProvider()) {
    await updateRequestStatus({
      id: request.id,
      remarks: parsed.data.remarks,
      status: "rejected",
    });
  } else {
    const { error } = await context.supabase!
      .from("certificate_requests")
      .update({
        remarks: parsed.data.remarks,
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (error) {
      redirectWithError(path, "Unable to reject request.");
    }
  }

  await logActivity({
    action: "Rejected certificate request",
    affectedRecordId: request.id,
    affectedTable: "certificate_requests",
    profile: context.profile,
    remarks: parsed.data.remarks,
    supabase: context.supabase,
  });

  const email = rejectedEmail(
    request.resident?.full_name ?? "Resident",
    certificateLabel(request.certificate_type),
    parsed.data.remarks,
  );

  await notifyAndLog({
    ...email,
    requestId: request.id,
    supabase: context.supabase,
    to: request.resident?.email,
  });

  redirectWithMessage(path, "Request rejected.");
}

export async function saveCertificateRecordAction(formData: FormData) {
  const parsed = saveCertificateSchema.safeParse({
    date_issued: formData.get("date_issued"),
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError(
      `/admin/generate-certificate/${formData.get("request_id") ?? ""}`,
      firstZodError(parsed.error),
    );
  }

  const path = `/admin/generate-certificate/${parsed.data.request_id}`;
  const context = await getAdminContextOrRedirect(path);
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request) {
    redirectWithError("/admin/certificate-requests", "Request not found.");
  }

  if (!isCertificateIssuanceConfigured()) {
    redirectWithError(path, CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE);
  }

  let issuedCertificate: Awaited<ReturnType<typeof issueCertificate>>;

  const settings = await getSystemSettings(context.supabase);
  try {
    issuedCertificate = await issueCertificate({
      dateIssued: parsed.data.date_issued,
      preparedBy: context.profile.full_name,
      preparedById: context.profile.id,
      request,
      settings,
    });
  } catch (error) {
    if (error instanceof CertificateIssuanceError) {
      redirectWithError(path, error.message);
    }
    redirectWithError(path, "Certificate issuance could not be completed.");
  }

  await logActivity({
    action: "Certificate generation",
    affectedRecordId: request.id,
    affectedTable: "certificate_records",
    profile: context.profile,
    remarks: `Issued ${issuedCertificate.certificateNumber} with QR verification metadata.`,
    supabase: context.supabase,
  });

  const readyEmail = certificateReadyEmail(
    request.resident?.full_name ?? "Resident",
    certificateLabel(request.certificate_type),
  );
  await notifyAndLog({
    ...readyEmail,
    requestId: request.id,
    supabase: context.supabase,
    to: request.resident?.email,
  });

  redirectWithMessage(path, "Certificate record saved.");
}

export async function revokeCertificateRecordAction(formData: FormData) {
  const parsed = revokeCertificateSchema.safeParse({
    certificate_record_id: formData.get("certificate_record_id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const context = await getAdminContextOrRedirect("/admin/certificate-requests");
  if (!isSqliteProvider()) {
    redirectWithError("/admin/certificate-requests", "Certificate revocation is not configured in this mode.");
  }

  const record = await getCertificateRecordById(parsed.data.certificate_record_id);
  if (!record) {
    redirectWithError("/admin/certificate-requests", "Certificate record not found.");
  }

  const path = `/admin/generate-certificate/${record.request_id}`;
  if (!(await revokeCertificateRecord({
    id: record.id,
    reason: parsed.data.reason,
    revokedBy: context.profile.id,
  }))) {
    redirectWithError(path, "Only an issued certificate can be revoked.");
  }

  await logActivity({
    action: "Certificate revoked",
    affectedRecordId: record.id,
    affectedTable: "certificate_records",
    profile: context.profile,
    remarks: parsed.data.reason,
    supabase: context.supabase,
  });

  redirectWithMessage(path, "Certificate revoked. You can now issue a replacement.");
}

export async function updateSystemSettingsAction(formData: FormData) {
  const parsed = systemSettingsSchema.safeParse({
    barangay_captain_name: formData.get("barangay_captain_name"),
  });
  if (!parsed.success) redirectWithError("/admin/settings", firstZodError(parsed.error));

  const context = await requireMainAdmin();
  if (context.setupMissing) {
    redirectWithError("/admin/settings", "This service is temporarily unavailable.");
  }

  const signatureFile = formData.get("signature_image");
  const hasSignatureFile = signatureFile instanceof File && signatureFile.size > 0;
  let storedSignature: Awaited<ReturnType<typeof storeSignatureImage>> | null = null;

  if (hasSignatureFile) {
    if (signatureFile.size > MAX_SIGNATURE_IMAGE_BYTES) {
      redirectWithError(
        "/admin/settings",
        "Signature image must be 2 MB or smaller.",
      );
    }

    const signatureBytes = new Uint8Array(await signatureFile.arrayBuffer());
    const signatureFormat = detectSignatureImageFormat(signatureBytes);
    if (!signatureFormat) {
      redirectWithError(
        "/admin/settings",
        "Signature image must be a valid PNG or JPEG file.",
      );
    }

    try {
      storedSignature = await storeSignatureImage(signatureBytes, signatureFormat);
    } catch {
      redirectWithError(
        "/admin/settings",
        "The signature image could not be stored. Please try again.",
      );
    }
  }

  const settingsToSave = [
    { key: "barangay_captain_name", value: parsed.data.barangay_captain_name },
    ...(storedSignature
      ? [
          { key: "signature_image_path", value: storedSignature.key },
          { key: "signature_image_provider", value: storedSignature.provider },
          { key: "signature_image_sha256", value: storedSignature.sha256 },
          {
            key: "signature_image_updated_at",
            value: new Date().toISOString(),
          },
        ]
      : []),
  ];

  if (isSqliteProvider()) {
    for (const setting of settingsToSave) {
      await setSystemSetting(setting.key, setting.value);
    }
  } else {
    const { error } = await context.supabase!.from("system_settings").upsert(
      settingsToSave,
      { onConflict: "key" },
    );
    if (error) redirectWithError("/admin/settings", "Unable to update settings.");
  }

  await logActivity({
    action: "System settings updated",
    affectedTable: "system_settings",
    profile: context.profile,
    remarks: storedSignature
      ? "Certificate signer name and visual signature image updated."
      : "Certificate signer name updated.",
    supabase: context.supabase,
  });
  redirectWithMessage(
    "/admin/settings",
    storedSignature
      ? "Signer name and signature image updated."
      : "Signer name updated.",
  );
}

export async function updatePaymentMethodSettingsAction(formData: FormData) {
  const context = await requireMainAdmin();
  if (context.setupMissing) {
    redirectWithError("/admin/settings", "This service is temporarily unavailable.");
  }

  const provider = String(formData.get("provider") ?? "");
  if (provider !== "gcash" && provider !== "maya") {
    redirectWithError("/admin/settings", "Invalid payment provider.");
  }

  const enabled =
    formData.get("enabled") === "on" || formData.get("enabled") === "true";
  const merchantName = String(formData.get("merchant_name") ?? "").trim();
  if (enabled && !merchantName) {
    redirectWithError(
      "/admin/settings",
      "CLIENT PAYMENT QR CONFIGURATION REQUIRED: Merchant display name is required before enabling this payment method.",
    );
  }

  const qrFile = formData.get("qr_image") as File | null;
  const currentSettings = await getSystemSettingsDirect();
  const currentConfig = currentSettings.paymentReceiving[provider];

  let newQrKey = currentConfig.qrStorageKey;
  let newQrProvider = currentConfig.qrStorageProvider;
  let newQrUpdatedAt = currentConfig.qrUpdatedAt;

  if (qrFile && qrFile.size > 0) {
    if (qrFile.size > MAX_PAYMENT_FILE_BYTES) {
      redirectWithError("/admin/settings", "QR code image must be 5 MB or smaller.");
    }
    const bytes = new Uint8Array(await qrFile.arrayBuffer());
    const format = detectImageFormat(bytes);
    if (!format) {
      redirectWithError(
        "/admin/settings",
        "QR code image must be a valid JPEG, PNG, or WebP file.",
      );
    }
    const stored = await storeMerchantQrImage(provider, bytes, format);
    newQrKey = stored.key;
    newQrProvider = stored.provider;
    newQrUpdatedAt = new Date().toISOString();
  }

  if (enabled && !newQrKey) {
    redirectWithError(
      "/admin/settings",
      "CLIENT PAYMENT QR CONFIGURATION REQUIRED: Official QR code image is required before enabling this payment method.",
    );
  }

  const newConfig = {
    enabled,
    merchantName,
    qrStorageKey: newQrKey,
    qrStorageProvider: newQrProvider,
    qrUpdatedAt: newQrUpdatedAt,
  };

  await updatePaymentReceivingConfig(provider, newConfig);

  await logActivity({
    action: "Payment settings updated",
    affectedTable: "system_settings",
    profile: context.profile,
    remarks: `Updated ${provider.toUpperCase()} payment receiving settings (enabled: ${enabled}).`,
    supabase: context.supabase,
  });

  redirectWithMessage(
    "/admin/settings",
    `${provider.toUpperCase()} payment settings updated successfully.`,
  );
}

export async function confirmPaymentAction(formData: FormData) {
  const context = await requireAdmin();
  if (context.setupMissing) {
    redirectWithError("/admin/payments", "This service is temporarily unavailable.");
  }

  const paymentId = String(formData.get("payment_id") ?? "");
  const remarks = String(formData.get("remarks") ?? "").trim();
  if (!paymentId) {
    redirectWithError("/admin/payments", "Payment ID is required.");
  }

  const payment = await getPaymentById(paymentId);
  if (!payment || payment.status !== "pending") {
    redirectWithError("/admin/payments", "This payment is not awaiting verification.");
  }

  if (!payment.proof_storage_key || !payment.proof_sha256) {
    redirectWithError(
      `/admin/payments/${paymentId}`,
      "Payment proof screenshot or verification checksum is missing from the record.",
    );
  }

  // Load private proof object and verify file existence + SHA-256 integrity
  const proofFile = await readPrivatePaymentFile({
    key: payment.proof_storage_key,
    provider: payment.proof_storage_provider || "local",
  });

  if (!proofFile || !proofFile.bytes || proofFile.bytes.length === 0) {
    redirectWithError(
      `/admin/payments/${paymentId}`,
      "Payment proof file is missing from private storage. Verification cannot proceed.",
    );
  }

  const computedChecksum = computeSha256(proofFile.bytes);
  if (computedChecksum !== payment.proof_sha256) {
    redirectWithError(
      `/admin/payments/${paymentId}`,
      "Payment proof file integrity verification failed. Checksum mismatch.",
    );
  }

  const confirmed = await confirmPaymentProof({
    paymentId,
    remarks: remarks || null,
    reviewerId: context.profile.id,
  });
  if (!confirmed) {
    redirectWithError(
      `/admin/payments/${paymentId}`,
      "Unable to confirm payment. Ensure the request is still eligible.",
    );
  }

  await logActivity({
    action: "Payment verified",
    affectedRecordId: paymentId,
    affectedTable: "payments",
    profile: context.profile,
    remarks: `Payment for request ${payment.request?.request_number ?? payment.request_id} verified.`,
    supabase: context.supabase,
  });

  if (payment.resident?.email) {
    const certLabel = payment.request
      ? certificateLabel(payment.request.certificate_type)
      : "Certificate";
    await notifyAndLog({
      message: `Dear ${payment.resident.full_name},

Good day.

Your payment for ${certLabel} (Request ${payment.request?.request_number ?? ""}) has been verified and confirmed by Barangay Bato staff.

Your certificate will now proceed for final processing and issuance.

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
      requestId: payment.request_id,
      subject: "Payment Verified - Certificate Request",
      supabase: context.supabase,
      to: payment.resident.email,
    });
  }

  redirectWithMessage(
    "/admin/payments",
    `Payment for ${payment.request?.request_number ?? "request"} verified successfully.`,
  );
}

export async function rejectPaymentAction(formData: FormData) {
  const context = await requireAdmin();
  if (context.setupMissing) {
    redirectWithError("/admin/payments", "This service is temporarily unavailable.");
  }

  const paymentId = String(formData.get("payment_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const customRemarks = String(formData.get("remarks") ?? "").trim();
  const finalReason = customRemarks ? `${reason}: ${customRemarks}` : reason;

  if (!paymentId || !reason) {
    redirectWithError(
      paymentId ? `/admin/payments/${paymentId}` : "/admin/payments",
      "A rejection reason is required.",
    );
  }

  const payment = await getPaymentById(paymentId);
  if (!payment || payment.status !== "pending") {
    redirectWithError("/admin/payments", "This payment is not awaiting verification.");
  }

  const rejected = await rejectPaymentProof({
    paymentId,
    rejectionReason: finalReason,
    reviewerId: context.profile.id,
  });

  if (!rejected) {
    redirectWithError(`/admin/payments/${paymentId}`, "Unable to reject payment.");
  }

  await logActivity({
    action: "Payment proof rejected",
    affectedRecordId: paymentId,
    affectedTable: "payments",
    profile: context.profile,
    remarks: `Payment for request ${payment.request?.request_number ?? payment.request_id} rejected. Reason: ${finalReason}`,
    supabase: context.supabase,
  });

  if (payment.resident?.email) {
    const certLabel = payment.request
      ? certificateLabel(payment.request.certificate_type)
      : "Certificate";
    await notifyAndLog({
      message: `Dear ${payment.resident.full_name},

Good day.

Your submitted payment proof for ${certLabel} (Request ${payment.request?.request_number ?? ""}) could not be verified by Barangay Bato staff.

Reason: ${finalReason}

Please sign in to the e-Certificate System to review and resubmit your payment details.

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
      requestId: payment.request_id,
      subject: "Payment Proof Rejected - Action Required",
      supabase: context.supabase,
      to: payment.resident.email,
    });
  }

  redirectWithMessage(
    "/admin/payments",
    `Payment proof rejected for ${payment.request?.request_number ?? "request"}.`,
  );
}

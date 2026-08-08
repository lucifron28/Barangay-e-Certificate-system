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
  createNotificationLog,
  getCertificateRecordById,
  revokeCertificateRecord,
  setSystemSetting,
  updateRequestStatus,
  upsertPickupSchedule,
} from "@/lib/db/sqlite/queries";
import { sendEmailNotification } from "@/lib/email/send-email-notification";
import { env } from "@/lib/env";
import {
  canMarkReady,
  canMarkDone,
  canRejectRequest,
  canScheduleRequest,
  isWithinOfficeHours,
  OFFICE_HOURS_LABEL,
} from "@/lib/services/business-rules";
import { getAdminRequest } from "@/lib/services/certificate-data";
import {
  acceptRequestSchema,
  markDoneSchema,
  markPaymentPaidSchema,
  markReadySchema,
  rejectRequestSchema,
  revokeCertificateSchema,
  saveCertificateSchema,
  scheduleSchema,
  systemSettingsSchema,
} from "@/lib/validations/admin";
import { certificateLabel } from "@/lib/utils/format";
import type { Json } from "@/types/database";
import {
  CertificateIssuanceError,
  issueCertificate,
} from "@/lib/services/certificate-issuance";
import {
  getCertificateDeliveryCopy,
  isFullyOnlineDemo,
} from "@/lib/services/issuance-mode";
import {
  CERTIFICATE_ISSUANCE_UNAVAILABLE_MESSAGE,
  isCertificateIssuanceConfigured,
} from "@/lib/services/certificate-lifecycle";

async function getAdminContextOrRedirect(path: string) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    redirectWithError(path, "Supabase is not configured yet.");
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
  const followUp = isFullyOnlineDemo
    ? "For further clarification, please contact Barangay Bato through the e-Certificate System."
    : `For further clarification, please visit the Barangay Bato office during office hours, ${OFFICE_HOURS_LABEL}.`;
  return {
    message: `Dear ${residentName},

Good day.

We regret to inform you that your request for ${certificateType} has been rejected.

Reason/Remarks: ${remarks}

${followUp}

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: "Certificate Request Rejected",
  };
}

function pickupEmail(
  residentName: string,
  certificateType: string,
  pickupDate: string,
  pickupTime: string,
) {
  return {
    message: `Dear ${residentName},

Good day.

Your request for ${certificateType} has been scheduled for pickup.

Pickup Date: ${pickupDate}
Pickup Time: ${pickupTime}
Location: Barangay Bato Office

Please claim your certificate during the assigned schedule. Certificate fees shall be settled at the barangay office upon pickup.

Office Hours: ${OFFICE_HOURS_LABEL}

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: "Pickup Schedule for Your Certificate Request",
  };
}

function certificateReadyEmail(residentName: string, certificateType: string) {
  const online = isFullyOnlineDemo;
  return {
    message: `Dear ${residentName},

Good day.

Your ${certificateType} is now ${online ? "ready as a secure PDF download" : "ready for pickup at the Barangay Bato office"}.

${online ? "Please sign in to My Certificates to download the issued PDF." : `Please proceed during office hours, ${OFFICE_HOURS_LABEL}, to claim your certificate.`}

${getCertificateDeliveryCopy().emailDelivery}

Thank you.

Barangay Bato e-Certificate System
Barangay Bato, Mauban, Quezon`,
    subject: online ? "Certificate Ready for Download" : "Certificate Ready for Pickup",
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
    createNotificationLog({
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
    updateRequestStatus({
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
    updateRequestStatus({
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

export async function setPickupScheduleAction(formData: FormData) {
  if (env.certificateIssuanceMode === "fully_online_demo") {
    redirectWithError(
      "/admin/certificate-requests",
      "Pickup scheduling is unavailable in fully online demo mode.",
    );
  }

  const parsed = scheduleSchema.safeParse({
    pickup_date: formData.get("pickup_date"),
    pickup_time: formData.get("pickup_time"),
    remarks: formData.get("remarks"),
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/pickup-schedules", firstZodError(parsed.error));
  }

  if (!isWithinOfficeHours(parsed.data.pickup_date, parsed.data.pickup_time)) {
    redirectWithError(
      "/admin/pickup-schedules",
      `Pickup must be scheduled within office hours: ${OFFICE_HOURS_LABEL}.`,
    );
  }

  const context = await getAdminContextOrRedirect("/admin/pickup-schedules");
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request) {
    redirectWithError("/admin/pickup-schedules", "Request not found.");
  }

  if (!canScheduleRequest(request.status)) {
    redirectWithError(
      "/admin/pickup-schedules",
      "Only accepted requests can be scheduled.",
    );
  }

  if (isSqliteProvider()) {
    upsertPickupSchedule({
      created_by: context.profile.id,
      pickup_date: parsed.data.pickup_date,
      pickup_time: parsed.data.pickup_time,
      remarks: parsed.data.remarks || null,
      request_id: request.id,
    });
  } else {
    const { error: scheduleError } = await context.supabase!
      .from("pickup_schedules")
      .upsert(
        {
          created_by: context.profile.id,
          pickup_date: parsed.data.pickup_date,
          pickup_time: parsed.data.pickup_time,
          remarks: parsed.data.remarks || null,
          request_id: request.id,
        },
        {
          onConflict: "request_id",
        },
      );

    if (scheduleError) {
      redirectWithError("/admin/pickup-schedules", "Unable to save schedule.");
    }

  }

  await logActivity({
    action: "Created pickup schedule",
    affectedRecordId: request.id,
    affectedTable: "pickup_schedules",
    profile: context.profile,
    remarks: "Pickup schedule assigned within official office hours.",
    supabase: context.supabase,
  });

  const scheduledEmail = pickupEmail(
    request.resident?.full_name ?? "Resident",
    certificateLabel(request.certificate_type),
    parsed.data.pickup_date,
    parsed.data.pickup_time,
  );
  await notifyAndLog({
    ...scheduledEmail,
    requestId: request.id,
    supabase: context.supabase,
    to: request.resident?.email,
  });
  redirectWithMessage("/admin/pickup-schedules", "Pickup schedule saved.");
}

export async function markRequestReadyAction(formData: FormData) {
  if (env.certificateIssuanceMode === "fully_online_demo") {
    redirectWithError(
      "/admin/certificate-requests",
      "Online certificates become ready after payment and issuance.",
    );
  }

  const parsed = markReadySchema.safeParse({
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const context = await getAdminContextOrRedirect("/admin/certificate-requests");
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (
    !request ||
    !canMarkReady(request.status, request.pickup_schedules.length > 0)
  ) {
    redirectWithError(
      "/admin/certificate-requests",
      "Only accepted requests with a pickup schedule can be marked ready for pickup.",
    );
  }

  if (isSqliteProvider()) {
    updateRequestStatus({ id: request.id, status: "ready_for_pickup" });
  } else {
    await context.supabase!
      .from("certificate_requests")
      .update({ status: "ready_for_pickup", updated_at: new Date().toISOString() })
      .eq("id", request.id);
  }

  await logActivity({
    action: "Changed request status",
    affectedRecordId: request.id,
    affectedTable: "certificate_requests",
    profile: context.profile,
    remarks: "Marked as ready for pickup.",
    supabase: context.supabase,
  });

  redirectWithMessage("/admin/certificate-requests", "Request marked ready.");
}

export async function markPaymentPaidAction(formData: FormData) {
  if (env.certificateIssuanceMode === "fully_online_demo") {
    redirectWithError(
      "/admin/certificate-requests",
      "Online demo payments must be completed by the resident.",
    );
  }
  const parsed = markPaymentPaidSchema.safeParse({
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const context = await getAdminContextOrRedirect("/admin/certificate-requests");
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request) {
    redirectWithError("/admin/certificate-requests", "Request not found.");
  }

  if (request.payment_status === "free") {
    redirectWithError("/admin/certificate-requests", "This certificate is free.");
  }

  if (request.status !== "accepted") {
    redirectWithError(
      "/admin/certificate-requests",
      "Only accepted requests can have office payment recorded.",
    );
  }

  if (isSqliteProvider()) {
    updateRequestStatus({
      id: request.id,
      paymentStatus: "paid",
      status: request.status,
    });
  } else {
    await context.supabase!
      .from("certificate_requests")
      .update({
        payment_status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id);
  }

  await logActivity({
    action: "Payment marked paid",
    affectedRecordId: request.id,
    affectedTable: "certificate_requests",
    profile: context.profile,
    remarks: "Office payment recorded in hybrid workflow.",
    supabase: context.supabase,
  });

  redirectWithMessage("/admin/certificate-requests", "Payment marked paid.");
}

export async function markRequestDoneAction(formData: FormData) {
  if (isFullyOnlineDemo) {
    redirectWithError(
      "/admin/certificate-requests",
      "Online certificates are completed when the resident downloads the issued PDF.",
    );
  }

  const parsed = markDoneSchema.safeParse({
    request_id: formData.get("request_id"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/certificate-requests", firstZodError(parsed.error));
  }

  const context = await getAdminContextOrRedirect("/admin/certificate-requests");
  const request = await getAdminRequest(parsed.data.request_id, context.supabase);

  if (!request || !canMarkDone(request.status)) {
    redirectWithError(
      "/admin/certificate-requests",
      "Only ready-for-pickup requests can be marked done.",
    );
  }

  if (isSqliteProvider()) {
    updateRequestStatus({
      dateReleased: new Date().toISOString(),
      id: request.id,
      status: "done",
    });
  } else {
    const { error } = await context.supabase!
      .from("certificate_requests")
      .update({
        date_released: new Date().toISOString(),
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "ready_for_pickup");

    if (error) {
      redirectWithError("/admin/certificate-requests", "Unable to mark as done.");
    }
  }

  await logActivity({
    action: "Marked request as done",
    affectedRecordId: request.id,
    affectedTable: "certificate_requests",
    profile: context.profile,
    remarks: "Certificate claimed by resident.",
    supabase: context.supabase,
  });

  redirectWithMessage("/admin/certificate-requests", "Request marked as done.");
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

  const record = getCertificateRecordById(parsed.data.certificate_record_id);
  if (!record) {
    redirectWithError("/admin/certificate-requests", "Certificate record not found.");
  }

  const path = `/admin/generate-certificate/${record.request_id}`;
  if (!revokeCertificateRecord({
    id: record.id,
    reason: parsed.data.reason,
    revokedBy: context.profile.id,
  })) {
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
    redirectWithError("/admin/settings", "Supabase is not configured yet.");
  }
  if (isSqliteProvider()) {
    setSystemSetting("barangay_captain_name", parsed.data.barangay_captain_name);
  } else {
    const { error } = await context.supabase!.from("system_settings").upsert([
      { key: "barangay_captain_name", value: parsed.data.barangay_captain_name },
    ], { onConflict: "key" });
    if (error) redirectWithError("/admin/settings", "Unable to update settings.");
  }

  await logActivity({
    action: "System settings updated",
    affectedTable: "system_settings",
    profile: context.profile,
    remarks: "Certificate signer settings updated.",
    supabase: context.supabase,
  });
  redirectWithMessage("/admin/settings", "Certificate signer settings updated.");
}

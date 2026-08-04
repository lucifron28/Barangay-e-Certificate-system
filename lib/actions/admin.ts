"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { randomUUID } from "node:crypto";
import { generateCertificatePdf } from "@/lib/certificates/pdf-generator";
import { savePrivateCertificatePdf } from "@/lib/certificates/private-storage";
import { sha256Hex } from "@/lib/security/document-hash";
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
  issueCertificateRecord,
  updateRequestStatus,
  upsertPickupSchedule,
} from "@/lib/db/sqlite/queries";
import { sendEmailNotification } from "@/lib/email/send-email-notification";
import { env } from "@/lib/env";
import {
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
  saveCertificateSchema,
  scheduleSchema,
} from "@/lib/validations/admin";
import { certificateLabel } from "@/lib/utils/format";
import type { Json } from "@/types/database";

async function getAdminContextOrRedirect(path: string) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    redirectWithError(path, "Supabase is not configured yet.");
  }

  return context;
}

function acceptedEmail(residentName: string, certificateType: string) {
  return {
    message: `Dear ${residentName},

Good day.

Your request for ${certificateType} has been accepted by Barangay Bato. Your submitted information has been reviewed and your certificate request will now proceed for processing.

Please wait for another email regarding the schedule or availability of your certificate for pickup.

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

For further clarification, please visit the Barangay Bato office during office hours, ${OFFICE_HOURS_LABEL}.

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

  if (!request || !request.pickup_schedules.length) {
    redirectWithError(
      "/admin/certificate-requests",
      "A pickup schedule is required before marking ready for pickup.",
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
    remarks: "Payment status recorded during pickup/claiming.",
    supabase: context.supabase,
  });

  redirectWithMessage("/admin/certificate-requests", "Payment marked paid.");
}

export async function markRequestDoneAction(formData: FormData) {
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

  const templateData: Json = {
    generated_at: new Date().toISOString(),
    note: "TODO: Exact PDF template positioning and final production asset handling pending client confirmation.",
    request,
    signature_notice:
      "Electronic signature display is a thesis/demo visual placeholder and not a legal digital signature.",
  };

  if (isSqliteProvider()) {
    if (request.status !== "accepted" || !["paid", "free"].includes(request.payment_status)) {
      redirectWithError(path, "Only accepted paid or free requests can be issued.");
    }
    const issuedAt = new Date(`${parsed.data.date_issued}T00:00:00.000Z`).toISOString();
    const settings = await getSystemSettings(context.supabase);
    const certificateId = randomUUID();
    const pdfBytes = await generateCertificatePdf({ barangayCaptainName: settings.barangayCaptainName, dateIssued: issuedAt, preparedBy: context.profile.full_name, request });
    const pdfPath = savePrivateCertificatePdf(certificateId, pdfBytes);
    const record = issueCertificateRecord({
      id: certificateId,
      date_issued: parsed.data.date_issued,
      issued_at: issuedAt,
      issuance_mode: env.certificateIssuanceMode,
      pdf_path: pdfPath,
      pdf_sha256: sha256Hex(pdfBytes),
      prepared_by: context.profile.id,
      request,
      template_data: templateData,
    });
    if (!record) redirectWithError(path, "A certificate was already issued for this request.");
  } else {
    const { error } = await context.supabase!.from("certificate_records").upsert(
      {
        certificate_type: request.certificate_type,
        control_number: request.control_number,
        date_issued: parsed.data.date_issued,
        prepared_by: context.profile.id,
        request_id: request.id,
        resident_id: request.resident_id,
        template_data: templateData,
      },
      {
        onConflict: "request_id",
      },
    );

    if (error) {
      redirectWithError(path, "Unable to save certificate record.");
    }
  }

  await logActivity({
    action: "Certificate generation",
    affectedRecordId: request.id,
    affectedTable: "certificate_records",
    profile: context.profile,
    remarks: "Printable certificate record saved.",
    supabase: context.supabase,
  });

  redirectWithMessage(path, "Certificate record saved.");
}

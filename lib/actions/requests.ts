"use server";

import { redirect } from "next/navigation";
import { requireResident } from "@/lib/auth/guards";
import { isSqliteProvider } from "@/lib/db/provider";
import {
  cancelRequest,
  createCertificateRequest,
  resubmitRejectedRequest,
} from "@/lib/db/sqlite/queries";
import {
  getCertificateFee,
  getDefaultPaymentStatus,
} from "@/lib/services/business-rules";
import {
  firstZodError,
  logActivity,
  redirectWithError,
  redirectWithMessage,
} from "@/lib/actions/helpers";
import { certificateRequestSchema } from "@/lib/validations/request";
import type { Json } from "@/types/database";

const REQUEST_PATH = "/resident/request-certificate";

function readTextField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readRequestForm(formData: FormData) {
  return certificateRequestSchema.safeParse({
    age: readTextField(formData, "age"),
    birthdate: readTextField(formData, "birthdate"),
    certificate_type: readTextField(formData, "certificate_type"),
    contact_number: readTextField(formData, "contact_number"),
    full_name: readTextField(formData, "full_name"),
    place_of_birth: readTextField(formData, "place_of_birth"),
    purpose: readTextField(formData, "purpose"),
    sitio: readTextField(formData, "sitio"),
    years_of_residency: readTextField(formData, "years_of_residency"),
  });
}

function yearsOfResidency(value: number | "" | undefined) {
  return value === "" ? null : value ?? null;
}

export async function createCertificateRequestAction(formData: FormData) {
  const context = await requireResident();

  if (context.setupMissing) {
    redirectWithError(REQUEST_PATH, "Supabase is not configured yet.");
  }
  const profile = context.profile;

  const parsed = readRequestForm(formData);

  if (!parsed.success) {
    redirectWithError(REQUEST_PATH, firstZodError(parsed.error));
  }

  const years = yearsOfResidency(parsed.data.years_of_residency);

  if (isSqliteProvider()) {
    const request = createCertificateRequest({
      age: parsed.data.age,
      birthdate: parsed.data.birthdate || null,
      certificate_type: parsed.data.certificate_type,
      contact_number: parsed.data.contact_number,
      full_name: parsed.data.full_name,
      place_of_birth: parsed.data.place_of_birth || null,
      purpose: parsed.data.purpose,
      resident_id: profile.id,
      sitio: parsed.data.sitio ?? "",
      years_of_residency: years,
    });

    if (!request) {
      redirectWithError(
        REQUEST_PATH,
        "Unable to submit request. Please check your details and try again.",
      );
    }

    await logActivity({
      action: "Created certificate request",
      affectedRecordId: request.id,
      affectedTable: "certificate_requests",
      profile,
      remarks: `Created ${request.request_number}.`,
      supabase: context.supabase,
    });

    redirect(
      `/resident/my-requests/${request.id}?message=${encodeURIComponent(
        "Certificate request submitted for review.",
      )}`,
    );
  }

  const submittedData: Json = {
    certificate_specific: {
      birthdate: parsed.data.birthdate || null,
      place_of_birth: parsed.data.place_of_birth || null,
      years_of_residency: years,
    },
    common: {
      address_sitio: parsed.data.sitio ?? null,
      age: parsed.data.age,
      contact_number: parsed.data.contact_number,
      date_requested: new Date().toISOString(),
      full_name: parsed.data.full_name,
      purpose: parsed.data.purpose,
    },
  };

  const { data, error } = await context.supabase!
    .from("certificate_requests")
    .insert({
      certificate_type: parsed.data.certificate_type,
      date_requested: new Date().toISOString(),
      fee_amount: getCertificateFee(parsed.data.certificate_type),
      payment_status: getDefaultPaymentStatus(parsed.data.certificate_type),
      purpose: parsed.data.purpose,
      resident_id: profile.id,
      status: "pending",
      submitted_data: submittedData,
    })
    .select("id, request_number")
    .single();

  if (error || !data) {
    redirectWithError(
      REQUEST_PATH,
      "Unable to submit request. Please check your details and try again.",
    );
  }

  await logActivity({
    action: "Created certificate request",
    affectedRecordId: data.id,
    affectedTable: "certificate_requests",
    profile,
    remarks: `Created ${data.request_number}.`,
    supabase: context.supabase,
  });

  redirect(
    `/resident/my-requests/${data.id}?message=${encodeURIComponent(
      "Certificate request submitted for review.",
    )}`,
  );
}

export async function cancelCertificateRequestAction(formData: FormData) {
  const context = await requireResident();
  if (context.setupMissing) {
    redirectWithError("/resident/my-requests", "Supabase is not configured yet.");
  }
  const profile = context.profile;
  const requestId = String(formData.get("request_id") ?? "");

  if (!requestId) {
    redirectWithError("/resident/my-requests", "Request not found.");
  }

  if (isSqliteProvider()) {
    const request = cancelRequest(requestId, profile.id);

    if (!request || request.status !== "cancelled") {
      redirectWithError(
        `/resident/my-requests/${requestId}`,
        "Only pending requests can be cancelled.",
      );
    }

    await logActivity({
      action: "Cancelled certificate request",
      affectedRecordId: requestId,
      affectedTable: "certificate_requests",
      profile,
      remarks: "Resident cancelled a pending request.",
      supabase: context.supabase,
    });

    redirectWithMessage("/resident/my-requests", "Request cancelled.");
  }

  const { error } = await context.supabase!
    .from("certificate_requests")
    .update({
      cancelled_at: new Date().toISOString(),
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("resident_id", profile.id)
    .eq("status", "pending");

  if (error) {
    redirectWithError(
      `/resident/my-requests/${requestId}`,
      "Only pending requests can be cancelled.",
    );
  }

  await logActivity({
    action: "Cancelled certificate request",
    affectedRecordId: requestId,
    affectedTable: "certificate_requests",
    profile,
    remarks: "Resident cancelled a pending request.",
    supabase: context.supabase,
  });

  redirectWithMessage("/resident/my-requests", "Request cancelled.");
}

export async function resubmitCertificateRequestAction(formData: FormData) {
  const context = await requireResident();
  if (context.setupMissing) {
    redirectWithError("/resident/my-requests", "Supabase is not configured yet.");
  }
  const profile = context.profile;
  const requestId = String(formData.get("request_id") ?? "");
  const parsed = readRequestForm(formData);

  if (!requestId || !parsed.success) {
    redirectWithError(
      `/resident/my-requests/${requestId || ""}`,
      parsed.success ? "Request not found." : firstZodError(parsed.error),
    );
  }

  const years = yearsOfResidency(parsed.data.years_of_residency);

  if (isSqliteProvider()) {
    const request = resubmitRejectedRequest({
      age: parsed.data.age,
      birthdate: parsed.data.birthdate || null,
      contact_number: parsed.data.contact_number,
      full_name: parsed.data.full_name,
      id: requestId,
      place_of_birth: parsed.data.place_of_birth || null,
      purpose: parsed.data.purpose,
      resident_id: profile.id,
      sitio: parsed.data.sitio ?? "",
      years_of_residency: years,
    });

    if (!request) {
      redirectWithError(
        `/resident/my-requests/${requestId}`,
        "Only rejected requests can be edited and resubmitted.",
      );
    }

    await logActivity({
      action: "Updated request details",
      affectedRecordId: requestId,
      affectedTable: "certificate_requests",
      profile,
      remarks: "Resident edited and resubmitted a rejected request.",
      supabase: context.supabase,
    });

    redirectWithMessage(`/resident/my-requests/${requestId}`, "Request resubmitted.");
  }

  const submittedData: Json = {
    certificate_specific: {
      birthdate: parsed.data.birthdate || null,
      place_of_birth: parsed.data.place_of_birth || null,
      years_of_residency: years,
    },
    common: {
      address_sitio: parsed.data.sitio ?? null,
      age: parsed.data.age,
      contact_number: parsed.data.contact_number,
      date_requested: new Date().toISOString(),
      full_name: parsed.data.full_name,
      purpose: parsed.data.purpose,
    },
  };

  const { error } = await context.supabase!
    .from("certificate_requests")
    .update({
      date_accepted: null,
      date_requested: new Date().toISOString(),
      purpose: parsed.data.purpose,
      remarks: null,
      status: "pending",
      submitted_data: submittedData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("resident_id", profile.id)
    .eq("status", "rejected");

  if (error) {
    redirectWithError(
      `/resident/my-requests/${requestId}`,
      "Only rejected requests can be edited and resubmitted.",
    );
  }

  await logActivity({
    action: "Updated request details",
    affectedRecordId: requestId,
    affectedTable: "certificate_requests",
    profile,
    remarks: "Resident edited and resubmitted a rejected request.",
    supabase: context.supabase,
  });

  redirectWithMessage(`/resident/my-requests/${requestId}`, "Request resubmitted.");
}

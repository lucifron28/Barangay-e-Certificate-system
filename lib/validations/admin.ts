import { z } from "zod";

export const acceptRequestSchema = z.object({
  request_id: z.string().uuid(),
  remarks: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  request_id: z.string().uuid(),
  remarks: z.string().min(1, "Rejection remarks are required."),
});

export const saveCertificateSchema = z.object({
  request_id: z.string().uuid(),
  date_issued: z.string().min(1, "Date issued is required."),
});

export const revokeCertificateSchema = z.object({
  certificate_record_id: z.string().uuid(),
  reason: z.string().trim().min(3, "A revocation reason is required."),
});

export const systemSettingsSchema = z.object({
  barangay_captain_name: z.string().trim().min(2, "Authorized official name is required."),
});

export const paymentMethodSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  merchant_name: z.string().trim().min(2, "Merchant display name is required."),
  provider: z.enum(["gcash", "maya"]),
});

export const confirmPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  remarks: z.string().trim().optional(),
});

export const rejectPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  remarks: z.string().trim().min(1, "A rejection reason is required."),
});

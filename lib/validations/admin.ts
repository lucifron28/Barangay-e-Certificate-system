import { z } from "zod";

export const acceptRequestSchema = z.object({
  request_id: z.string().uuid(),
  remarks: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  request_id: z.string().uuid(),
  remarks: z.string().min(1, "Rejection remarks are required."),
});

export const scheduleSchema = z.object({
  request_id: z.string().uuid(),
  pickup_date: z.string().min(1, "Pickup date is required."),
  pickup_time: z.string().min(1, "Pickup time is required."),
  remarks: z.string().optional(),
});

export const markDoneSchema = z.object({
  request_id: z.string().uuid(),
});

export const markReadySchema = z.object({
  request_id: z.string().uuid(),
});

export const markPaymentPaidSchema = z.object({
  request_id: z.string().uuid(),
});

export const saveCertificateSchema = z.object({
  request_id: z.string().uuid(),
  date_issued: z.string().min(1, "Date issued is required."),
});

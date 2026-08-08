import { z } from "zod";
import { getCertificateFieldRequirements } from "@/lib/services/certificate-fields";
import { CERTIFICATE_TYPES } from "@/types/enums";

export const certificateRequestSchema = z.object({
  certificate_type: z.enum(CERTIFICATE_TYPES, {
    error: "Certificate type is required.",
  }),
  full_name: z.string().min(1, "Full name is required."),
  age: z.coerce.number().int().min(1, "Age is required."),
  sitio: z.string().optional(),
  purpose: z.string().min(1, "Purpose is required."),
  contact_number: z.string().min(1, "Contact number is required."),
  birthdate: z.string().optional(),
  place_of_birth: z.string().optional(),
  years_of_residency: z.coerce.number().int().min(0).optional().or(z.literal("")),
}).superRefine((data, context) => {
  for (const requirement of getCertificateFieldRequirements(data.certificate_type)) {
    const value = data[requirement.name];
    if (value === undefined || value === null || String(value).trim() === "") {
      context.addIssue({
        code: "custom",
        message: requirement.message,
        path: [requirement.name],
      });
    }
  }
});

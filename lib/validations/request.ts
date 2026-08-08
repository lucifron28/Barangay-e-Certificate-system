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
  const requiredMessages: Record<string, string> = {
    age: "Age is required.",
    birthdate: "Birthdate is required for Barangay Residency.",
    contact_number: "Contact number is required.",
    full_name: "Full name is required.",
    place_of_birth: "Place of birth is required for Barangay Certificate.",
    purpose: "Purpose is required.",
    sitio: "Address or sitio is required for this certificate.",
    years_of_residency: "Years of residency is required for Barangay Residency.",
  };

  for (const requirement of getCertificateFieldRequirements(data.certificate_type)) {
    const value = data[requirement.name];
    if (value === undefined || value === null || String(value).trim() === "") {
      context.addIssue({
        code: "custom",
        message: requiredMessages[requirement.name] ?? `${requirement.label} is required.`,
        path: [requirement.name],
      });
    }
  }
});

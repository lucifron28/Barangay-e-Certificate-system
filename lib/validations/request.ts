import { z } from "zod";
import { CERTIFICATE_TYPES } from "@/types/enums";

export const certificateRequestSchema = z.object({
  certificate_type: z.enum(CERTIFICATE_TYPES, {
    error: "Certificate type is required.",
  }),
  full_name: z.string().min(1, "Full name is required."),
  age: z.coerce.number().int().min(1, "Age is required."),
  sitio: z.string().min(1, "Address or sitio is required."),
  purpose: z.string().min(1, "Purpose is required."),
  contact_number: z.string().min(1, "Contact number is required."),
  date_requested: z.string().optional(),
  birthdate: z.string().optional(),
  place_of_birth: z.string().optional(),
  years_of_residency: z.coerce.number().int().min(0).optional().or(z.literal("")),
}).superRefine((data, context) => {
  if (
    data.certificate_type === "barangay_certificate" &&
    !data.place_of_birth?.trim()
  ) {
    context.addIssue({
      code: "custom",
      message: "Place of birth is required for Barangay Certificate.",
      path: ["place_of_birth"],
    });
  }

  if (data.certificate_type === "barangay_residency") {
    if (!data.birthdate?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Birthdate is required for Barangay Residency.",
        path: ["birthdate"],
      });
    }

    if (data.years_of_residency === "" || data.years_of_residency === undefined) {
      context.addIssue({
        code: "custom",
        message: "Years of residency is required for Barangay Residency.",
        path: ["years_of_residency"],
      });
    }
  }
});

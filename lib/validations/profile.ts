import { z } from "zod";

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Full name is required."),
  age: z.coerce.number().int().min(1, "Age is required.").optional(),
  address_sitio: z.string().min(1, "Address or sitio is required."),
  date_of_birth: z.string().optional(),
  civil_status: z.string().optional(),
  contact_number: z.string().min(1, "Contact number is required."),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  username: z.string().optional(),
});

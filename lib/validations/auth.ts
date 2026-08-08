import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required."),
    age: z.coerce.number().int().min(1, "Age is required."),
    address_sitio: z.string().min(1, "Address or sitio is required."),
    date_of_birth: z.string().optional(),
    civil_status: z.string().optional(),
    contact_number: z.string().min(1, "Contact number is required."),
    gender: z.string().optional(),
    occupation: z.string().optional(),
    email: z
      .string()
      .min(1, "Email address is required.")
      .email("Email address must be valid."),
    username: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(1, "Password is required."),
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Password and confirm password do not match.",
    path: ["confirm_password"],
  });

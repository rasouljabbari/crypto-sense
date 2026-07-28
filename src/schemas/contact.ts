import { z } from "zod";

export const contactSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name too long"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name too long"),
  email: z.string().email("Invalid email address"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

import { z } from "zod";

/** Trim + sanitize: strip null bytes, collapse whitespace */
function sanitize(s: string): string {
  return s.replace(/\0/g, "").replace(/\s+/g, " ").trim();
}

export const contactSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name too long")
    .transform(sanitize),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name too long")
    .transform(sanitize),
  email: z.string().email("Invalid email address").transform(sanitize),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters")
    .transform(sanitize),
  /** Honeypot — must be empty */
  website: z.string().max(0, "Bot detected").optional().default(""),
  /** Cloudflare Turnstile token */
  turnstileToken: z.string().min(1, "Security verification required"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

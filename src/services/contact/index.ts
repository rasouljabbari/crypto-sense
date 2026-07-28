import { Resend } from "resend";
import { ownerEmailTemplate } from "./email/owner-template";
import { autoReplyTemplate } from "./email/auto-reply-template";
import { logContactAttempt, logRateLimited } from "./logger";
import { checkRateLimit } from "./rate-limit";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(apiKey);
}

const OWNER_EMAIL = "rjdeveloper17@gmail.com";
const FROM_EMAIL = "Crypto Sense <onboarding@resend.dev>";

interface ContactServiceResult {
  success: boolean;
  error?: string;
  retryAfterMs?: number;
}

export async function sendContactEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  ip: string;
  userAgent: string;
}): Promise<ContactServiceResult> {
  // Rate limit check
  const rateCheck = checkRateLimit(data.ip);
  if (!rateCheck.allowed) {
    logRateLimited(data.ip);
    return {
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfterMs: rateCheck.retryAfterMs,
    };
  }

  const timestamp = new Date().toISOString();

  try {
    // Send email to owner
    const { error: ownerError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: `New Contact Message - Crypto Sense`,
      html: ownerEmailTemplate({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        message: data.message,
        timestamp,
        ip: data.ip,
        userAgent: data.userAgent,
      }),
      replyTo: data.email,
    });

    if (ownerError) {
      logContactAttempt({
        email: data.email,
        ip: data.ip,
        success: false,
        error: `Owner email failed: ${ownerError.message}`,
      });
      return { success: false, error: "Failed to send message. Please try again." };
    }

    // Send auto-reply to visitor
    const { error: replyError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "Thank you for contacting Crypto Sense",
      html: autoReplyTemplate(data.firstName),
    });

    if (replyError) {
      // Log but don't fail — owner email was sent successfully
      logContactAttempt({
        email: data.email,
        ip: data.ip,
        success: true,
        error: `Auto-reply failed: ${replyError.message}`,
      });
    } else {
      logContactAttempt({ email: data.email, ip: data.ip, success: true });
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    logContactAttempt({ email: data.email, ip: data.ip, success: false, error: errorMsg });
    return { success: false, error: "Failed to send message. Please try again." };
  }
}

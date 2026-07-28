import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/schemas/contact";
import { sendContactEmail } from "@/services/contact";
import { verifyTurnstile } from "@/services/contact/turnstile";
import { checkSpam } from "@/services/contact/spam";
import { logRejected } from "@/services/contact/logger";

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = getClientIP(req);

    // 1. Honeypot check (before schema parse)
    if (body.website && body.website.length > 0) {
      logRejected({ ip, reason: "honeypot" });
      return NextResponse.json({ success: true }, { status: 200 }); // fake success for bots
    }

    // 2. Validate input with Zod (includes turnstileToken + sanitize transforms)
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      logRejected({ ip, reason: "validation", detail: firstError });
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // 3. Cloudflare Turnstile verification
    const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
    if (!turnstile.success) {
      logRejected({ ip, reason: "turnstile", detail: turnstile.error });
      return NextResponse.json({ error: "Security verification failed" }, { status: 403 });
    }

    // 4. Spam detection
    const spamResult = checkSpam(parsed.data);
    if (spamResult.isSpam) {
      logRejected({ ip, reason: "spam", detail: spamResult.reason });
      return NextResponse.json({ success: true }, { status: 200 }); // fake success for spam
    }

    // 5. Send email
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const { turnstileToken: _, website: __, ...emailData } = parsed.data;

    const result = await sendContactEmail({
      ...emailData,
      ip,
      userAgent,
    });

    if (!result.success) {
      const status = result.retryAfterMs ? 429 : 500;
      const response: Record<string, unknown> = {
        error: result.error,
      };
      if (result.retryAfterMs) {
        response.retryAfterMs = result.retryAfterMs;
      }
      return NextResponse.json(response, { status });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

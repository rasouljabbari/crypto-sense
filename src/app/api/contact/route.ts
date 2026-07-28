import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/schemas/contact";
import { sendContactEmail } from "@/services/contact";

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

    // Validate input
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const ip = getClientIP(req);
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    const result = await sendContactEmail({
      ...parsed.data,
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

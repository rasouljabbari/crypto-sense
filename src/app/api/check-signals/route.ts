import { NextRequest, NextResponse } from "next/server";
import { processTimeframe } from "./process";

// ─── POST handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    let timeframe: string;
    try {
      const body = await req.json();
      timeframe = body?.timeframe ?? "1h";
    } catch {
      timeframe = "1h";
    }

    // Validate timeframe
    const valid = ["15m", "1h", "4h", "1d"];
    if (!valid.includes(timeframe)) {
      return NextResponse.json({ error: `Invalid timeframe: ${timeframe}` }, { status: 400 });
    }

    const result = await processTimeframe(timeframe);

    return NextResponse.json({
      success: true,
      timeframe,
      checked: result.checked,
      emailsSent: result.sent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[CheckSignals] API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

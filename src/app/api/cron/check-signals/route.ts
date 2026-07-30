import { NextRequest, NextResponse } from "next/server";
import { processTimeframe } from "./process";

const TIMEFRAMES = ["15m", "1h", "4h", "1d"] as const;

export async function POST(req: NextRequest) {
  // Simple bearer check — set CRON_SECRET in env for production
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, Awaited<ReturnType<typeof processTimeframe>>> = {};
  for (const tf of TIMEFRAMES) {
    results[tf] = await processTimeframe(tf);
  }

  const totalSent = Object.values(results).reduce((s, r) => s + r.sent, 0);
  const totalErrors = Object.values(results).reduce((s, r) => s + r.errors.length, 0);

  return NextResponse.json({
    success: true,
    results,
    totals: { sent: totalSent, errors: totalErrors },
  });
}

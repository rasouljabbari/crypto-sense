import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSignalEmail } from "@/services/signal-notify";

export async function POST(req: NextRequest) {
  try {
    // Authenticate — only logged-in users can send emails
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coinId, symbol, direction, confidence, price } = body;

    // Validate required fields
    if (!coinId || !symbol || !direction || confidence == null || price == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate direction
    if (direction !== "Long" && direction !== "Short") {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }

    // Send email — uses session email, not client-provided email
    const result = await sendSignalEmail({
      email: session.user.email,
      symbol,
      direction,
      confidence,
      price,
      coinId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[SignalNotify] API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

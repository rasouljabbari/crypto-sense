import { NextResponse } from "next/server";
import { writeAnalysis } from "@/features/analysis-engine/services/ai";
import type { AnalysisWriterInput } from "@/features/analysis-engine/services/ai";

const keyStatus =
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-")
    ? "configured"
    : "missing";

if (keyStatus === "missing") {
  console.warn(
    "[api/analysis] OPENAI_API_KEY is not configured. AI analysis will return an error.",
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body.", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const input = body as AnalysisWriterInput;

    if (!input.scores || typeof input.scores !== "object") {
      return NextResponse.json(
        { error: "Missing required field: scores.", code: "INVALID_INPUT" },
        { status: 400 },
      );
    }

    const result = await writeAnalysis(input);

    if ("error" in result) {
      const status =
        result.code === "NO_API_KEY" ? 503 : result.code === "API_ERROR" ? 502 : 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error processing analysis request.";
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 });
  }
}

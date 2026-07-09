// ---------------------------------------------------------------------------
// GPT Analysis Writer
//
// Takes Score Engine output and generates a professional-grade written
// analysis.  The prompt is engineered to NEVER invent numbers — only the
// scores and factor contributions provided in the input are used.
// ---------------------------------------------------------------------------

import { createOpenAiClient } from "./client";
import { getApiKeyStatus } from "./newsAnalyzer";
import type { ScoreEngineOutput } from "../scoring";
import type {
  AnalysisWriterInput,
  AnalysisWriterOutput,
  GptErrorResult,
} from "./types";

const SYSTEM_PROMPT = `You are a professional cryptocurrency analyst.

Your task is to write a concise analysis based SOLELY on the numerical scores and factor breakdowns provided below.

CRITICAL RULES:
- NEVER invent, assume, or hallucinate any numbers, prices, percentages, or market data.
- ONLY use the scores and factor values that appear in the input.
- If a factor contributed positively, say so. If negatively, say so.
- Do NOT reference external events, news, or price action unless it is explicitly given in the input.
- Write in a professional, objective tone — no hype, no fear-mongering.
- Total response MUST be 250 words or fewer.

Return ONLY valid JSON with NO markdown formatting, no code blocks, no extra text:

{
  "analysis": "A concise 1-2 paragraph summary of the overall picture.",
  "whyScoreHigh": "Explanation of which dimensions are driving scores up and why.",
  "whyScoreLow": "Explanation of which dimensions are dragging scores down and why.",
  "whatHappened": "Brief description of the technical/sentiment/risk conditions.",
  "keyRisks": ["specific risk factor tied to a low score or negative contribution", "..."],
  "keyOpportunities": ["specific opportunity tied to a high score or positive contribution", "..."]
}`;

function serializeScores(scores: ScoreEngineOutput): string {
  const lines: string[] = [];

  lines.push(`Overall Score: ${scores.overall}/100`);
  lines.push(`Confidence: ${scores.confidence}/100`);
  lines.push("");

  const dimensions: Array<{ name: string; value: number; label: string }> = [
    { name: "Technical", value: scores.technical, label: scores.breakdown.technical.label },
    { name: "Trend", value: scores.trend, label: scores.breakdown.trend.label },
    { name: "Momentum", value: scores.momentum, label: scores.breakdown.momentum.label },
    { name: "Volume", value: scores.volume, label: scores.breakdown.volume.label },
    { name: "Sentiment", value: scores.sentiment, label: scores.breakdown.sentiment.label },
    { name: "Risk", value: scores.risk, label: scores.breakdown.risk.label },
    { name: "Confidence", value: scores.confidence, label: scores.breakdown.confidence.label },
  ];

  for (const d of dimensions) {
    lines.push(`${d.name}: ${d.value}/100 (${d.label})`);
    const detail = scores.breakdown[d.name.toLowerCase() as keyof typeof scores.breakdown] as
      | { readonly factors: readonly { readonly name: string; readonly weight: number; readonly raw: number; readonly contribution: number }[] }
      | undefined;

    if (detail) {
      for (const f of detail.factors) {
        const sign = f.contribution >= 0 ? "+" : "";
        lines.push(`  ${f.name}: ${sign}${f.contribution}pts (weight ${f.weight}, raw ${f.raw})`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function parseGptResponse(raw: string): AnalysisWriterOutput {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.analysis !== "string" ||
    typeof parsed.whyScoreHigh !== "string" ||
    typeof parsed.whyScoreLow !== "string" ||
    typeof parsed.whatHappened !== "string" ||
    !Array.isArray(parsed.keyRisks) ||
    !Array.isArray(parsed.keyOpportunities)
  ) {
    throw new Error("GPT returned an unexpected response shape.");
  }

  return {
    analysis: parsed.analysis.slice(0, 1000),
    whyScoreHigh: parsed.whyScoreHigh.slice(0, 500),
    whyScoreLow: parsed.whyScoreLow.slice(0, 500),
    whatHappened: parsed.whatHappened.slice(0, 500),
    keyRisks: parsed.keyRisks.slice(0, 5).map(String),
    keyOpportunities: parsed.keyOpportunities.slice(0, 5).map(String),
  };
}

export async function writeAnalysis(
  input: AnalysisWriterInput,
): Promise<AnalysisWriterOutput | GptErrorResult> {
  if (getApiKeyStatus() === "missing") {
    return { error: "OpenAI API key is not configured.", code: "NO_API_KEY" };
  }

  try {
    const client = createOpenAiClient();
    const coinContext = input.coinName ?? input.coinId ?? "Unknown";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Asset: ${coinContext}`,
            `Coin ID: ${input.coinId ?? "N/A"}`,
            "",
            "=== SCORE DATA ===",
            serializeScores(input.scores),
            "",
            "Write a professional analysis based ONLY on the scores above. Never invent numbers.",
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { error: "GPT returned an empty response.", code: "INVALID_RESPONSE" };
    }

    return parseGptResponse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error calling GPT.";
    return { error: msg, code: "API_ERROR" };
  }
}

// ---------------------------------------------------------------------------
// GPT News Sentiment Analyzer
//
// Takes pre-processed news articles and returns a structured sentiment
// analysis using GPT.  The prompt is engineered to prevent hallucination:
// the model is strictly instructed to base its response ONLY on the
// provided articles and never invent facts.
// ---------------------------------------------------------------------------

import { createOpenAiClient } from "./client";
import type {
  GptNewsSentiment,
  GptNewsAnalysisInput,
  GptNewsAnalysisOutput,
  GptErrorResult,
} from "./types";

const SYSTEM_PROMPT = `You are a cryptocurrency news sentiment analyzer.

Your task is to analyze the provided news articles and determine whether the overall sentiment is bullish, bearish, or neutral for the cryptocurrency in question.

CRITICAL RULES:
- Base your analysis ONLY on the articles provided below.
- NEVER invent, assume, or hallucinate any news, facts, or data.
- NEVER refer to any article not listed in the input.
- If the articles are irrelevant or contain no meaningful signal, return "neutral".
- Confidence must be 0-100, reflecting how clear the signal is.
- Provide 1-3 brief, specific reasons tied directly to article content.

Return ONLY valid JSON with NO markdown formatting, no code blocks, no extra text:

{
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "reasons": ["reason1", "reason2", ...]
}`;

function buildUserPrompt(
  articles: readonly {
    title: string;
    source: string;
    summary: string;
    sentiment: string;
  }[],
  coinId?: string,
): string {
  const coinContext = coinId
    ? `Coin of interest: ${coinId}\n\n`
    : "";

  const articleLines = articles.map(
    (a, i) =>
      `[${i + 1}] Title: ${a.title}\n    Source: ${a.source}\n    Summary: ${a.summary}\n    Classification: ${a.sentiment}`,
  );

  return (
    `${coinContext}Analyze the following ${articles.length} news article(s) and determine the overall sentiment.\n\n` +
    articleLines.join("\n\n")
  );
}

function parseGptResponse(raw: string): GptNewsAnalysisOutput {
  let cleaned = raw.trim();

  // Strip markdown code fences if GPT wraps in triple backticks
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.sentiment !== "string" ||
    !["bullish", "bearish", "neutral"].includes(parsed.sentiment) ||
    typeof parsed.confidence !== "number" ||
    !Array.isArray(parsed.reasons)
  ) {
    throw new Error("GPT returned an unexpected response shape.");
  }

  return {
    sentiment: parsed.sentiment as GptNewsSentiment,
    confidence: Math.round(Math.max(0, Math.min(100, parsed.confidence))),
    reasons: parsed.reasons.slice(0, 5).map(String),
  };
}

export function getApiKeyStatus(): "configured" | "missing" {
  const key = process.env.OPENAI_API_KEY;
  if (key && key !== "" && key.startsWith("sk-")) return "configured";
  return "missing";
}

export async function analyzeNewsWithGpt(
  input: GptNewsAnalysisInput,
): Promise<GptNewsAnalysisOutput | GptErrorResult> {
  const keyStatus = getApiKeyStatus();
  if (keyStatus === "missing") {
    return { error: "OpenAI API key is not configured.", code: "NO_API_KEY" };
  }

  if (input.articles.length === 0) {
    return {
      sentiment: "neutral",
      confidence: 0,
      reasons: ["No articles provided for analysis."],
    };
  }

  try {
    const client = createOpenAiClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(input.articles, input.coinId),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        error: "GPT returned an empty response.",
        code: "INVALID_RESPONSE",
      };
    }

    return parseGptResponse(content);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error calling GPT.";
    return { error: message, code: "API_ERROR" };
  }
}

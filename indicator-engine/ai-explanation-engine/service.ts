import type { MarketAnalysisResult } from "../market-analyzer/types";
import type { AIProvider } from "./providers/abstract";
import type { AnalysisExplanation } from "./types";
import { buildPrompt } from "./prompts/builder";

function extractJson(raw: string): string {
  const stripped = raw.trim();

  if (stripped.startsWith("```")) {
    const lines = stripped.split("\n");
    const start = lines[0].startsWith("```") ? 1 : 0;
    const end = lines[lines.length - 1].startsWith("```") ? lines.length - 1 : lines.length;
    return lines.slice(start, end).join("\n").trim();
  }

  return stripped;
}

function parseExplanation(raw: string): AnalysisExplanation {
  const cleaned = extractJson(raw);
  const parsed = JSON.parse(cleaned) as Partial<AnalysisExplanation>;

  return {
    summary: parsed.summary ?? "",
    whyBuy: Array.isArray(parsed.whyBuy) ? parsed.whyBuy : [],
    whySell: Array.isArray(parsed.whySell) ? parsed.whySell : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    newsSummary: parsed.newsSummary ?? "",
    disclaimer: parsed.disclaimer ?? "Trading carries substantial risk. This analysis is for informational purposes only and does not constitute financial advice.",
  };
}

export class AnalysisExplanationService {
  constructor(private readonly provider: AIProvider) {}

  async generate(analysis: MarketAnalysisResult): Promise<AnalysisExplanation> {
    const prompt = buildPrompt(analysis);
    const raw = await this.provider.generate(prompt);
    return parseExplanation(raw);
  }
}

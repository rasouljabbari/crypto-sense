// ---------------------------------------------------------------------------
// AI Service — Types
// ---------------------------------------------------------------------------

import type { NormalizedArticle } from "../newsEngine";
import type { ScoreEngineOutput } from "../scoring";

export type GptNewsSentiment = "bullish" | "bearish" | "neutral";

export interface GptNewsAnalysisInput {
  readonly articles: readonly NormalizedArticle[];
  readonly coinId?: string;
}

export interface GptNewsAnalysisOutput {
  readonly sentiment: GptNewsSentiment;
  readonly confidence: number;
  readonly reasons: readonly string[];
}

export interface AnalysisWriterInput {
  readonly scores: ScoreEngineOutput;
  readonly coinId?: string;
  readonly coinName?: string;
}

export interface AnalysisWriterOutput {
  readonly analysis: string;
  readonly whyScoreHigh: string;
  readonly whyScoreLow: string;
  readonly whatHappened: string;
  readonly keyRisks: readonly string[];
  readonly keyOpportunities: readonly string[];
}

export interface GptErrorResult {
  readonly error: string;
  readonly code: "NO_API_KEY" | "API_ERROR" | "INVALID_RESPONSE";
}

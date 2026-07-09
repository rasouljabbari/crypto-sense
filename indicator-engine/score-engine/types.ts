import type { MarketAnalysisResult } from "../market-analyzer";

export type ScoreEngineSignal = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";

export interface ScoreEngineWeights {
  readonly trend: number;
  readonly momentum: number;
  readonly volume: number;
  readonly volatility: number;
  readonly risk: number;
}

export interface ScoreEngineOutput {
  readonly scores: {
    readonly trend: number;
    readonly momentum: number;
    readonly volume: number;
    readonly volatility: number;
    readonly risk: number;
  };
  readonly overall: number;
  readonly confidence: number;
  readonly signal: ScoreEngineSignal;
  readonly weights: ScoreEngineWeights;
}

export type { MarketAnalysisResult };

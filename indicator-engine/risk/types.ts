import type {
  AtrResult,
  AdxResult,
  VolatilityResult,
  SupportResult,
  ResistanceResult,
} from "../types";

export type RiskLevel = "very_low" | "low" | "medium" | "high" | "extreme";

export interface RiskInput {
  readonly atr: AtrResult;
  readonly adx: AdxResult;
  readonly volatility: VolatilityResult;
  readonly support: SupportResult;
  readonly resistance: ResistanceResult;
  readonly currentPrice: number;
}

export interface RiskResult {
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly suggestedStopLoss: number;
  readonly riskPercentage: number;
}

import type {
  RsiResult,
  MovingAverageResult,
  MacdResult,
  AdxResult,
  ObvResult,
  VwapResult,
  ResistanceResult,
  SupportResult,
  VolatilityResult,
} from "../types";

export interface ScoreEngineInput {
  readonly rsi: RsiResult;
  readonly ema20: MovingAverageResult;
  readonly ema50: MovingAverageResult;
  readonly ema200: MovingAverageResult;
  readonly macd: MacdResult;
  readonly adx: AdxResult;
  readonly obv: ObvResult;
  readonly vwap: VwapResult;
  readonly currentPrice: number;
  readonly resistance: ResistanceResult;
  readonly support: SupportResult;
  readonly volatility: VolatilityResult;
}

export interface FactorDetail {
  readonly name: string;
  readonly raw: number;
}

export interface ScoreBreakdownItem {
  readonly value: number;
  readonly label: ScoreLabel;
  readonly factors: readonly FactorDetail[];
}

export type ScoreLabel =
  | "very_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "very_bearish";

export interface ScoreEngineOutput {
  readonly technical: number;
  readonly trend: number;
  readonly momentum: number;
  readonly volume: number;
  readonly volatilityScore: number;
  readonly overall: number;
  readonly confidence: number;
  readonly breakdown: {
    readonly technical: ScoreBreakdownItem;
    readonly trend: ScoreBreakdownItem;
    readonly momentum: ScoreBreakdownItem;
    readonly volume: ScoreBreakdownItem;
    readonly volatilityScore: ScoreBreakdownItem;
    readonly overall: ScoreBreakdownItem;
    readonly confidence: ScoreBreakdownItem;
  };
}

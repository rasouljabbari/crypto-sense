// ---------------------------------------------------------------------------
// Score Engine — Input / Output Types
// ---------------------------------------------------------------------------

import type {
  RsiResult,
  MacdResult,
  MovingAverageResult,
  BollingerBandResult,
  AdxResult,
  AtrResult,
  ObvResult,
  StochasticRsiResult,
  SupportResistanceResult,
  TrendDirection,
} from "../../types";

// ─── Input ────────────────────────────────────────────────────────────────

export interface IndicatorInput {
  readonly rsi: RsiResult;
  readonly macd: MacdResult;
  readonly ema20: MovingAverageResult;
  readonly ema50: MovingAverageResult;
  readonly ema200: MovingAverageResult;
  readonly bollingerBands: BollingerBandResult;
  readonly adx: AdxResult;
  readonly atr: AtrResult;
  readonly obv: ObvResult;
  readonly stochasticRsi: StochasticRsiResult;
  readonly supportResistance: SupportResistanceResult;
  readonly trendDirection: TrendDirection;
}

export interface PriceInput {
  readonly currentPrice: number;
  readonly priceChangePercent24h: number;
  readonly volume24h: number;
  readonly marketCap: number;
}

export interface SentimentInput {
  readonly fearGreedScore: number | null;
  readonly newsScore: number | null;
  readonly newsPositiveRatio: number | null;
  readonly newsArticleCount: number | null;
}

export interface ScoreEngineInput {
  readonly indicators: IndicatorInput;
  readonly price: PriceInput;
  readonly sentiment: SentimentInput;
}

// ─── Output ───────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  readonly technical: ComponentDetail;
  readonly trend: ComponentDetail;
  readonly momentum: ComponentDetail;
  readonly volume: ComponentDetail;
  readonly volatility: ComponentDetail;
  readonly sentiment: ComponentDetail;
  readonly risk: ComponentDetail;
  readonly confidence: ComponentDetail;
}

export interface ComponentDetail {
  readonly value: number;
  readonly label: string;
  readonly status: string;
  readonly explanation: string;
  readonly factors: readonly FactorContribution[];
}

export interface FactorContribution {
  readonly name: string;
  readonly weight: number;
  readonly raw: number;
  readonly contribution: number;
  readonly reason: string;
}

export interface ScoreEngineOutput {
  readonly overall: number;
  readonly technical: number;
  readonly trend: number;
  readonly momentum: number;
  readonly volume: number;
  readonly volatility: number;
  readonly sentiment: number;
  readonly risk: number;
  readonly confidence: number;
  readonly breakdown: ScoreBreakdown;
}

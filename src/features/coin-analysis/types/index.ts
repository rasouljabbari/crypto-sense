// ---------------------------------------------------------------------------
// Coin Analysis — Local Types
// ---------------------------------------------------------------------------
// Types used only in the coin-analysis feature.
// ---------------------------------------------------------------------------

import type {
  IndividualScore,
  IndividualScores,
  OverallScore,
  TradeExplanation,
  TradeSetupResult,
  TradingSignalType,
} from "./scoring";

// ─── CoinAnalysisState ────────────────────────────────────────────────────

export interface CoinAnalysisState {
  status: "loading" | "ready" | "error" | "noResult";
  error: string | null;
  scores: IndividualScores;
  overallScore: OverallScore;
  signal: { type: TradingSignalType };
  hasTrade: boolean;
  tradeReason?: string;
  tradeSetup: TradeSetupResult;
  confidence: number;
  tradeQuality: number;
  market: MarketCardData;
  indicators: readonly IndicatorItem[];
  trends: readonly TimeframeTrendData[];
  explanation: TradeExplanation;
}

// ─── MarketCardData ───────────────────────────────────────────────────────

export interface SrLevelDisplay {
  price: string;
  distancePercent: number;
  strength: number;
}

export interface MarketCardData {
  price: string;
  change24h: string;
  changePercent24h: string;
  isPositive: boolean;
  high24h: string;
  low24h: string;
  volume: string;
  trend: string;
  trendStatus: "bullish" | "bearish" | "neutral";
  volatility: string;
  volatilityStatus: "low" | "medium" | "high";
  nearestSupport?: string;
  nearestResistance?: string;
  srSupport?: SrLevelDisplay | null;
  srResistance?: SrLevelDisplay | null;
}

// ─── IndicatorItem ───────────────────────────────────────────────────────

export interface TimeframeTrendData {
  timeframe: string;
  trend: string;
  confidence: number;
  isActive: boolean;
}

export interface IndicatorItem {
  key: string;
  label: string;
  value: string;
  status: "bullish" | "bearish" | "neutral";
  statusLabel: string;
  interpretation: string;
}

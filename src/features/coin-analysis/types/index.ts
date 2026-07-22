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

export interface ZoneReactionDisplay {
  readonly candleIndex: number;
  readonly type: "touch" | "rejection" | "pin_bar" | "long_wick" | "engulfing" | "impulsive";
  readonly price: number;
  readonly strength: number;
}

export interface SrLevelDisplay {
  price: string;
  distancePercent: number;
  strength: number;
  type: "support" | "resistance";
  reason?: string;
  detectedFrom?: string;
  priceRange?: { min: number; max: number };
  volumeNote?: string;
  detectedTimeframes?: readonly string[];
  alignmentScore?: number;
  touchCount?: number;
  reactionStrength?: number;
  reactionHistory?: readonly ZoneReactionDisplay[];
  volumeQuality?: "strong" | "moderate" | "weak" | "neutral";
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
  srLevels?: readonly SrLevelDisplay[];
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

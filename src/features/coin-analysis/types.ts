import type { TradingSignalType } from "@/features/analysis-engine/services/signaling";
import type { ExplanationData } from "@/features/analysis-engine/services/explanation";

/* ── Re-export explanation data ──────────────────────────────────────────── */

export type { ExplanationData };

/* ── Dimension score (one per scoring dimension) ───────────────────────── */

export interface DimensionScore {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly status: string;
  readonly explanation: string;
  readonly reasons: readonly string[];
}

/* ── Market card data ──────────────────────────────────────────────────── */

export interface MarketCardData {
  readonly price: string;
  readonly change24h: string;
  readonly changePercent24h: string;
  readonly isPositive: boolean;
  readonly high24h: string;
  readonly low24h: string;
  readonly volume: string;
  readonly trend: string;
  readonly trendStatus: "bullish" | "bearish" | "neutral";
  readonly volatility: string;
  readonly volatilityStatus: "low" | "medium" | "high" | "extreme";
}

/* ── Indicator item ────────────────────────────────────────────────────── */

export interface IndicatorItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly status: "positive" | "negative" | "neutral" | "warning";
  readonly statusLabel: string;
}

/* ── Coin Analysis hook result ─────────────────────────────────────────── */

export interface CoinAnalysisState {
  readonly status: "loading" | "error" | "noResult" | "ready";
  readonly error: Error | null;
  readonly overall: number;
  readonly signal: TradingSignalType;
  readonly confidence: number;
  readonly dimensions: readonly DimensionScore[];
  readonly hasTrade: boolean;
  readonly tradeReason: string | null;
  readonly entry: string;
  readonly entryDirection: "long" | "short";
  readonly entryDirectionLabel: string;
  readonly stopLoss: string;
  readonly takeProfit: { tp1: string; tp2: string; tp3: string };
  readonly market: MarketCardData;
  readonly indicators: readonly IndicatorItem[];
  readonly explanation: ExplanationData | null;
}

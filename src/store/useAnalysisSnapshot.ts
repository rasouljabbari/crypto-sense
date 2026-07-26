"use client";

import { create } from "zustand";
import type { CoinAnalysisState, IndicatorItem, TimeframeTrendData } from "@/features/coin-analysis/types";
import type { TradeExplanation } from "@/features/coin-analysis/types/scoring";
import type { CoinAnalysis } from "@/lib/types";
import type { TimeframeOption } from "@/lib/timeframe";

/* ─── Analysis Snapshot — immutable value object ────────────────────── */

export interface AnalysisSnapshot {
  readonly coin: string;
  readonly symbol: string;
  readonly name: string;
  readonly image: string;
  readonly timeframe: string;
  readonly marketState: {
    readonly price: string;
    readonly change24h: string;
    readonly changePercent24h: string;
    readonly isPositive: boolean;
    readonly high24h: string;
    readonly low24h: string;
    readonly volume: string;
    readonly marketCap: string;
    readonly trend: string;
    readonly trendStatus: "bullish" | "bearish" | "neutral";
    readonly volatility: string;
    readonly volatilityStatus: "low" | "medium" | "high";
    readonly nearestSupport?: string;
    readonly nearestResistance?: string;
  };
  readonly opportunity: {
    readonly signal: string;
    readonly score: number;
    readonly confidence: number;
    readonly recommendation: string;
    readonly reasonCode: string;
  };
  readonly strength: {
    readonly trend: number;
    readonly momentum: number;
    readonly volume: number;
    readonly volatility: number;
  };
  readonly strengthReasons: {
    readonly trend: readonly string[];
    readonly momentum: readonly string[];
    readonly volume: readonly string[];
    readonly volatility: readonly string[];
  };
  readonly risk: {
    readonly score: number;
    readonly level: string;
    readonly reasons: readonly string[];
  };
  readonly tradeSetup: {
    readonly hasTrade: boolean;
    readonly direction?: "long" | "short";
    readonly entry?: number;
    readonly stopLoss?: number;
    readonly takeProfit?: { readonly tp1?: number; readonly tp2?: number; readonly tp3?: number };
    readonly riskReward?: { readonly tp1?: number; readonly tp2?: number; readonly tp3?: number };
    readonly quality?: number;
    readonly reason?: string;
  };
  readonly indicators: readonly IndicatorItem[];
  readonly trends: readonly TimeframeTrendData[];
  readonly explanation: TradeExplanation;
  readonly srLevels: readonly CoinAnalysisState["market"]["srLevels"];
  readonly price: number;
  readonly generatedAt: number;
  readonly version: number;
}

/* ─── Snapshot Collection — per-timeframe, coinId→snapshot ──────────── */

export type SnapshotCollection = Record<string, AnalysisSnapshot>;

const TIMEFRAMES: readonly TimeframeOption[] = ["15m", "1h", "4h", "1d"];

function emptyCollections(): Record<TimeframeOption, SnapshotCollection> {
  return { "15m": {}, "1h": {}, "4h": {}, "1d": {} };
}

/* ─── Central Snapshot Store ────────────────────────────────────────── */
/* Single source of truth. No page owns analysis state.                 */
/* All analysis lives in AnalysisProvider → publishes here.             */

interface SnapshotStore {
  /** Per-timeframe snapshot collections. UI reads from this. */
  collections: Record<TimeframeOption, SnapshotCollection>;
  version: number;
  isLoading: boolean;
  lastUpdated: string | null;
  refreshKey: number;
  indicators: {
    totalMarketCap: number;
    totalVolume24h: number;
    btcDominance: number;
    ethDominance: number;
    bnbDominance: number;
    othersDominance: number;
  };

  /** Replace entire collection for one timeframe. Other timeframes untouched. */
  publishTimeframe: (timeframe: TimeframeOption, snapshots: SnapshotCollection, indicators?: SnapshotStore["indicators"]) => void;
  /** Replace a single snapshot inside a timeframe collection. */
  setSnapshot: (coinId: string, timeframe: TimeframeOption, snapshot: AnalysisSnapshot) => void;
  setLoading: (v: boolean) => void;
  setIndicators: (v: SnapshotStore["indicators"]) => void;
  triggerRefresh: () => void;
}

export const useSnapshotStore = create<SnapshotStore>((set) => ({
  collections: emptyCollections(),
  version: 0,
  isLoading: true,
  lastUpdated: null,
  refreshKey: 0,
  indicators: {
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    ethDominance: 0,
    bnbDominance: 0,
    othersDominance: 0,
  },

  publishTimeframe: (timeframe, newSnapshots, indicators) =>
    set((s) => ({
      version: s.version + 1,
      collections: { ...s.collections, [timeframe]: newSnapshots },
      indicators: indicators ?? s.indicators,
      isLoading: false,
      lastUpdated: new Date().toISOString(),
    })),

  setSnapshot: (coinId, timeframe, snapshot) =>
    set((s) => ({
      collections: {
        ...s.collections,
        [timeframe]: { ...s.collections[timeframe], [coinId]: snapshot },
      },
    })),

  setLoading: (v) => set({ isLoading: v }),
  setIndicators: (v) => set({ indicators: v, lastUpdated: new Date().toISOString() }),
  triggerRefresh: () =>
    set((s) => ({
      isLoading: true,
      refreshKey: s.refreshKey + 1,
    })),
}));

/* ─── Selector Helpers ──────────────────────────────────────────────── */

/** Returns the snapshot collection for a given timeframe. */
export const selectCollection = (tf: TimeframeOption) => (s: SnapshotStore) =>
  s.collections[tf];

/** Returns snapshots as an array for a given timeframe. */
export const selectSnapshots = (tf: TimeframeOption) => (s: SnapshotStore) =>
  Object.values(s.collections[tf]);

/* ─── Snapshot Builders ─────────────────────────────────────────────── */

let _globalVersion = 0;

/** Build snapshot from legacy bulk analysis engine. */
export function buildSnapshotFromLegacy(
  c: CoinAnalysis,
  timeframe: string,
): AnalysisSnapshot {
  _globalVersion += 1;
  const md = c.marketData;
  const sig = c.signal ?? "Neutral";
  const priceStr = `$${md.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  const change24hStr = `${md.priceChange24h >= 0 ? "+" : ""}$${md.priceChange24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const changePctStr = `${md.priceChangePercent24h >= 0 ? "+" : ""}${md.priceChangePercent24h.toFixed(2)}%`;

  return {
    coin: c.coinId,
    symbol: c.marketData.symbol,
    name: c.marketData.name,
    image: c.marketData.image,
    timeframe,
    marketState: {
      price: priceStr,
      change24h: change24hStr,
      changePercent24h: changePctStr,
      isPositive: md.priceChangePercent24h >= 0,
      high24h: `$${md.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      low24h: `$${md.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      volume: `$${(md.volume24h / 1e6).toFixed(1)}M`,
      marketCap: md.marketCap != null ? `$${(md.marketCap / 1e9).toFixed(2)}B` : "—",
      trend: c.trendLabel ?? "Neutral",
      trendStatus: "neutral",
      volatility: "—",
      volatilityStatus: "medium",
    },
    opportunity: {
      signal: sig,
      score: c.overallScore ?? 50,
      confidence: c.confidence ?? 50,
      recommendation: c.recommendation ?? "",
      reasonCode: c.recommendationReasonCode ?? "",
    },
    strength: {
      trend: c.overallScore ?? 50,
      momentum: 50,
      volume: 50,
      volatility: 50,
    },
    strengthReasons: {
      trend: [],
      momentum: [],
      volume: [],
      volatility: [],
    },
    risk: {
      score: c.riskLevel === "low" ? 80 : c.riskLevel === "medium" ? 50 : 20,
      level: c.riskLevel ?? "medium",
      reasons: [],
    },
    tradeSetup: {
      hasTrade: false,
      direction: c.position === "long" ? "long" : c.position === "short" ? "short" : undefined,
      quality: c.tradeQuality ?? 0,
    },
    indicators: [],
    trends: [],
    explanation: {
      summary: `${sig} — Score ${c.overallScore ?? 50}/100`,
      strengths: [],
      weaknesses: [],
      risks: [],
      recommendation: c.recommendation ?? "",
    },
    srLevels: undefined,
    price: md.currentPrice,
    generatedAt: Date.now(),
    version: _globalVersion,
  };
}

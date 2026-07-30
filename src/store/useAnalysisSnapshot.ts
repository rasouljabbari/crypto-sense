"use client";

import type { TradeSetupData, TrendLabel } from "@/lib/types";
import { create } from "zustand";
import type { IndicatorItem, SrLevelDisplay, TimeframeTrendData } from "@/features/coin-analysis/types";
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
    /** Price change % over the selected timeframe (from klines). */
    readonly timeframeChangePercent: string;
    /** Raw numeric value for sorting. */
    readonly timeframeChangePercentRaw: number;
  };
  readonly opportunity: {
    readonly signal: string;
    readonly score: number;
    readonly confidence: number;
    readonly recommendation: string;
    readonly reasonCode: string;
    readonly reasons: readonly string[];
    readonly warnings: readonly string[];
    readonly analysisVersion: string;
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
  readonly srLevels?: readonly SrLevelDisplay[];
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
  error: string | null;
  lastUpdated: string | null;
  refreshKey: number;
  /** Tracks which timeframes have loaded since last refresh. */
  loadedTimeframes: Record<string, boolean>;
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
  setError: (v: string | null) => void;
  setIndicators: (v: SnapshotStore["indicators"]) => void;
  triggerRefresh: () => void;
}

export const useSnapshotStore = create<SnapshotStore>((set) => ({
  collections: emptyCollections(),
  version: 0,
  isLoading: true,
  error: null,
  lastUpdated: null,
  refreshKey: 0,
  loadedTimeframes: {},
  indicators: {
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
    ethDominance: 0,
    bnbDominance: 0,
    othersDominance: 0,
  },

  publishTimeframe: (timeframe, newSnapshots, indicators) =>
    set((s) => {
      const loaded = { ...s.loadedTimeframes, [timeframe]: true };
      const allLoaded = TIMEFRAMES.every((tf) => loaded[tf]);
      return {
        version: s.version + 1,
        collections: { ...s.collections, [timeframe]: newSnapshots },
        indicators: indicators ?? s.indicators,
        isLoading: !allLoaded,
        loadedTimeframes: loaded,
        lastUpdated: new Date().toISOString(),
      };
    }),

  setSnapshot: (coinId, timeframe, snapshot) =>
    set((s) => ({
      version: s.version + 1,
      collections: {
        ...s.collections,
        [timeframe]: { ...s.collections[timeframe], [coinId]: snapshot },
      },
      lastUpdated: new Date().toISOString(),
    })),

  setLoading: (v) => set({ isLoading: v }),
  setError: (v) => set({ error: v }),
  setIndicators: (v) =>
    set((s) => ({
      indicators: v,
      loadedTimeframes: { ...s.loadedTimeframes, "1h": true },
      lastUpdated: new Date().toISOString(),
    })),
  triggerRefresh: () =>
    set((s) => ({
      isLoading: true,
      loadedTimeframes: {},
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
  const sig = c.signal ?? "neutral";
  const priceStr = `$${md.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  const change24hStr = `${md.priceChange24h >= 0 ? "+" : ""}$${md.priceChange24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const changePctStr = `${md.priceChangePercent24h >= 0 ? "+" : ""}${md.priceChangePercent24h.toFixed(2)}%`;

  function fmtMarketCap(mc: number): string {
    if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
    if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
    if (mc >= 1e6) return `$${(mc / 1e6).toFixed(2)}M`;
    if (mc >= 1e3) return `$${(mc / 1e3).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  }

  const ts: TradeSetupData = c.tradeSetup ?? {};
  const hasTrade = ts.hasTrade === true;

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
      marketCap: md.marketCap != null ? fmtMarketCap(md.marketCap) : "—",
      trend: c.trendLabel ?? "sideways",
      trendStatus: c.trendLabel === "bullish" || c.trendLabel === "strong_bullish"
        ? "bullish"
        : c.trendLabel === "bearish" || c.trendLabel === "strong_bearish"
          ? "bearish"
          : "neutral",
      volatility: c.technicalIndicators?.atr > 0
        ? ((c.technicalIndicators.atr / md.currentPrice) * 100).toFixed(1) + "%"
        : "—",
      volatilityStatus: (c.technicalIndicators?.atr ?? 0) > 0
        ? ((c.technicalIndicators.atr / md.currentPrice) * 100) > 3
          ? "high"
          : ((c.technicalIndicators.atr / md.currentPrice) * 100) > 1
            ? "medium"
            : "low"
        : "medium",
      timeframeChangePercent: c.technicalIndicators?.priceChangePercent != null
        ? `${c.technicalIndicators.priceChangePercent >= 0 ? "+" : ""}${c.technicalIndicators.priceChangePercent.toFixed(2)}%`
        : changePctStr,
      timeframeChangePercentRaw: c.technicalIndicators?.priceChangePercent ?? md.priceChangePercent24h,
    },
    opportunity: {
      signal: sig,
      score: c.overallScore ?? 50,
      confidence: c.confidence ?? 50,
      recommendation: c.recommendation ?? "",
      reasonCode: c.recommendationReasonCode ?? "",
      reasons: c.reasons ?? [],
      warnings: c.warnings ?? [],
      analysisVersion: c.analysisVersion ?? "",
    },
    strength: {
      trend: c.trendScore ?? c.overallScore ?? 50,
      momentum: c.momentumScore ?? 50,
      volume: c.volumeScore ?? 50,
      volatility: c.technicalIndicators?.atr > 0
        ? Math.min(100, Math.round(((c.technicalIndicators.atr / md.currentPrice) * 100) / 5 * 100))
        : 50,
    },
    strengthReasons: {
      trend: [],
      momentum: [],
      volume: [],
      volatility: [],
    },
    risk: {
      score: c.riskScore ?? 50,
      level: c.riskLevel ?? "medium",
      reasons: [],
    },
    tradeSetup: {
      hasTrade,
      direction: hasTrade ? ts.direction ?? undefined : undefined,
      entry: hasTrade ? ts.entry : undefined,
      stopLoss: hasTrade ? ts.stopLoss : undefined,
      takeProfit: hasTrade ? ts.takeProfit : undefined,
      riskReward: hasTrade && ts.riskReward ? { tp1: ts.riskReward.tp1, tp2: ts.riskReward.tp2, tp3: ts.riskReward.tp3 } : undefined,
      quality: c.tradeQuality ?? (hasTrade ? ts.tradeQuality : 0) ?? 0,
      reason: hasTrade ? (ts.reason ?? undefined) : undefined,
    },
    indicators: (() => {
      const ti = c.technicalIndicators;
      const items: IndicatorItem[] = [];

      const rsiVal = ti?.rsi ?? 50;
      const rsiStatus: IndicatorItem["status"] = rsiVal < 30 ? "bullish" : rsiVal > 70 ? "bearish" : "neutral";
      const rsiLabel = rsiVal < 30 ? "Oversold" : rsiVal > 70 ? "Overbought" : rsiVal < 45 ? "Bullish" : rsiVal > 55 ? "Bearish" : "Neutral";
      items.push({
        key: "rsi", label: "RSI", value: rsiVal.toFixed(1),
        status: rsiStatus, statusLabel: rsiLabel,
        interpretation: rsiVal < 30 ? "Oversold — potential reversal up" : rsiVal > 70 ? "Overbought — potential reversal down" : "Neutral zone",
      });

      if (ti?.macd) {
        const m = ti.macd;
        const macdStatus: IndicatorItem["status"] = m.histogram > 0 ? "bullish" : "bearish";
        const macdLabel = m.value > m.signal && m.histogram > 0 ? "Bullish Cross" : m.value < m.signal && m.histogram < 0 ? "Bearish Cross" : m.histogram > 0 ? "Bullish Momentum" : "Bearish Momentum";
        items.push({
          key: "macd", label: "MACD", value: m.histogram.toFixed(2),
          status: macdStatus, statusLabel: macdLabel,
          interpretation: macdLabel,
        });
      }

      const adxVal = ti?.adx ?? 20;
      const adxStatus: IndicatorItem["status"] = adxVal >= 25 ? (rsiVal > 50 ? "bullish" : rsiVal < 50 ? "bearish" : "neutral") : "neutral";
      const adxLabel = adxVal >= 50 ? "Very Strong Trend" : adxVal >= 30 ? "Strong Trend" : adxVal >= 20 ? "Moderate Trend" : "Weak Trend";
      const adxInterpretation = adxVal >= 30 ? "Buyers in Control" : adxVal >= 25 ? "Trending Market" : "Ranging Market";
      items.push({
        key: "adx", label: "ADX", value: adxVal.toFixed(1),
        status: adxStatus, statusLabel: adxLabel,
        interpretation: adxInterpretation,
      });

      if (ti) {
        const ema9 = ti.ema9, ema21 = ti.ema21, ema50 = ti.ema50, ema200 = ti.ema200;
        const bullAlign = ema9 > ema21 && ema21 > ema50;
        const bearAlign = ema9 < ema21 && ema21 < ema50;
        const emaStatus: IndicatorItem["status"] = bullAlign ? "bullish" : bearAlign ? "bearish" : "neutral";
        const emaLabel = bullAlign && ema50 > ema200 ? "Bullish Alignment" : bullAlign ? "Short-term Bullish" : bearAlign && ema50 < ema200 ? "Bearish Alignment" : bearAlign ? "Short-term Bearish" : "Mixed";
        items.push({
          key: "ema", label: "EMA", value: `9:${ema9.toFixed(2)} / 21:${ema21.toFixed(2)}`,
          status: emaStatus, statusLabel: emaLabel,
          interpretation: emaLabel,
        });
      }

      return items;
    })(),
    trends: (() => {
      const ta = c.trendAnalysis;
      if (!ta) return [];
      const tfKeys: ["15m", "1h", "4h", "1d"] = ["15m", "1h", "4h", "1d"];
      const activeTf = timeframe as string;
      return tfKeys.map((tf) => ({
        timeframe: tf,
        trend: ta[tf].trend,
        confidence: ta[tf].confidence,
        isActive: tf === activeTf,
      }));
    })(),
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

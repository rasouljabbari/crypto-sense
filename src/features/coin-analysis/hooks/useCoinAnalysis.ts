"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { useAnalysis } from "@/features/analysis-engine/hooks/useAnalysis";
import { detectMultiTimeframeSR } from "@/features/analysis-engine/services/SmartSupportResistance";
import type { SmartSupportResistanceInput } from "@/features/analysis-engine/services/SmartSupportResistance";
import { computeIndicators } from "@/features/analysis-engine/hooks/_computeIndicators";
import { calcEma } from "@/features/analysis-engine/indicators/_helpers";
import { buildTradeSetup } from "@/features/analysis-engine/services";
import type { CoinAnalysisState, MarketCardData, IndicatorItem, TimeframeTrendData, SrLevelDisplay } from "../types";
import type { CandleCollection } from "@/features/analysis-engine/types";
import type { ScoreEngineOutput } from "@/features/analysis-engine/services/scoring";
import type { TradingSignalOutput } from "@/features/analysis-engine/services/signaling";
import type { TradingSignalType } from "../types/scoring";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtPrice(value: number): string {
  const decimals = value < 0.01 ? 6 : value < 1 ? 4 : value < 10 ? 3 : 2;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function rangeCenter(r: { min: number; max: number }): number {
  return (r.min + r.max) / 2;
}

function getNearestSR(market: ReturnType<typeof useAnalysis>["market"], _interval: string = "1h"): Pick<MarketCardData, "nearestSupport" | "nearestResistance" | "srSupport" | "srResistance" | "srLevels"> {
  if (!market) return {};

  const currentPrice = market.price.current;

  // Build inputs for all available timeframes (15m, 1h, 4h, 1d, 1w)
  const tfKeys: (keyof CandleCollection)[] = ["15m", "1h", "4h", "1d", "1w"];
  const inputs: Record<string, SmartSupportResistanceInput> = {};

  for (const key of tfKeys) {
    const candles = market.candles[key];
    if (!candles || candles.length < 20) continue;
    inputs[key] = {
      highs: candles.map(c => c.high),
      lows: candles.map(c => c.low),
      closes: candles.map(c => c.close),
      opens: candles.map(c => c.open),
      volumes: candles.map(c => c.volume),
      currentPrice,
    };
  }

  if (Object.keys(inputs).length === 0) return {};

  // Multi-timeframe detection (runs Layer 1+2 per TF, then merges)
  const { zones } = detectMultiTimeframeSR(inputs, currentPrice);

  const supports = zones.filter(z => z.type === "support");
  const resistances = zones.filter(z => z.type === "resistance");

  const nearestSupport = supports.length > 0 ? fmtPrice(rangeCenter(supports[0].priceRange)) : undefined;
  const nearestResistance = resistances.length > 0 ? fmtPrice(rangeCenter(resistances[0].priceRange)) : undefined;

  const srSupport: SrLevelDisplay | null = supports.length > 0
    ? {
        price: fmtPrice(rangeCenter(supports[0].priceRange)),
        distancePercent: Math.abs((rangeCenter(supports[0].priceRange) - currentPrice) / currentPrice * 100),
        strength: Math.round(supports[0].confidence / 20),
        type: "support",
        reason: supports[0].reason,
        detectedFrom: supports[0].detectedFrom,
        priceRange: supports[0].priceRange,
        volumeNote: supports[0].volumeNote,
        volumeQuality: supports[0].volumeQuality,
        detectedTimeframes: supports[0].detectedTimeframes,
        alignmentScore: supports[0].alignmentScore,
        touchCount: supports[0].touchCount,
        reactionStrength: supports[0].reactionStrength,
        reactionHistory: supports[0].reactionHistory,
      }
    : null;

  const srResistance: SrLevelDisplay | null = resistances.length > 0
    ? {
        price: fmtPrice(rangeCenter(resistances[0].priceRange)),
        distancePercent: Math.abs((rangeCenter(resistances[0].priceRange) - currentPrice) / currentPrice * 100),
        strength: Math.round(resistances[0].confidence / 20),
        type: "resistance",
        reason: resistances[0].reason,
        detectedFrom: resistances[0].detectedFrom,
        priceRange: resistances[0].priceRange,
        volumeNote: resistances[0].volumeNote,
        volumeQuality: resistances[0].volumeQuality,
        detectedTimeframes: resistances[0].detectedTimeframes,
        alignmentScore: resistances[0].alignmentScore,
        touchCount: resistances[0].touchCount,
        reactionStrength: resistances[0].reactionStrength,
        reactionHistory: resistances[0].reactionHistory,
      }
    : null;

  // Build full level list for chart rendering (all detected zones)
  const srLevels: SrLevelDisplay[] = zones.map(z => ({
    price: fmtPrice(rangeCenter(z.priceRange)),
    distancePercent: Math.abs((rangeCenter(z.priceRange) - currentPrice) / currentPrice * 100),
    strength: Math.round(z.confidence / 20),
    type: z.type,
    reason: z.reason,
    detectedFrom: z.detectedFrom,
    priceRange: z.priceRange,
    volumeNote: z.volumeNote,
    volumeQuality: z.volumeQuality,
    detectedTimeframes: z.detectedTimeframes,
    alignmentScore: z.alignmentScore,
    touchCount: z.touchCount,
    reactionStrength: z.reactionStrength,
    reactionHistory: z.reactionHistory,
  }));

  return { nearestSupport, nearestResistance, srSupport, srResistance, srLevels };
}

function buildMarketCard(
  market: ReturnType<typeof useAnalysis>["market"],
  interval?: string,
): MarketCardData {
  const p = market?.price;
  const sr = getNearestSR(market, interval);

  return {
    price: p?.current ? fmtPrice(p.current) : "—",
    change24h: p
      ? `$${p.change24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—",
    changePercent24h: p
      ? `${p.changePercent24h >= 0 ? "+" : ""}${p.changePercent24h.toFixed(2)}%`
      : "—",
    isPositive: p ? p.changePercent24h >= 0 : false,
    high24h: p ? `$${p.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—",
    low24h: p ? `$${p.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—",
    volume: p ? formatVolume(p.volume24h) : "—",
    trend: "—",
    trendStatus: "neutral",
    volatility: "—",
    volatilityStatus: "medium",
    ...sr,
    srLevels: sr.srLevels ?? [],
  };
}

function buildIndicatorItems(
  raw: NonNullable<ReturnType<typeof computeIndicators>>,
  currentPrice: number,
): readonly IndicatorItem[] {
  const rsi = raw.rsi;
  const macd = raw.macd;
  const adx = raw.adx;
  const ema20 = raw.ema20.value;
  const ema50 = raw.ema50.value;
  const atr_val = raw.atr.value;
  const bb = raw.bollingerBands;

  const items: IndicatorItem[] = [];

  // ── RSI ──────────────────────────────────────────────────────────────
  {
    const val = rsi.value.toFixed(1);
    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (rsi.value > 70) {
      status = "bearish";
      statusLabel = "Overbought";
      interpretation = "bearish_reversal";
    } else if (rsi.value < 30) {
      status = "bullish";
      statusLabel = "Oversold";
      interpretation = "bullish_recovery";
    } else {
      status = "neutral";
      statusLabel = "Neutral";
      interpretation = "normal_trading";
    }

    items.push({ key: "rsi", label: "RSI", value: val, status, statusLabel, interpretation });
  }

  // ── MACD ─────────────────────────────────────────────────────────────
  {
    const hist = macd.histogram;
    const bullish = macd.bullish;
    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (bullish && hist > 0) {
      status = "bullish";
      statusLabel = "Bullish Cross";
      interpretation = "momentum_increasing";
    } else if (!bullish && hist < 0) {
      status = "bearish";
      statusLabel = "Bearish Cross";
      interpretation = "momentum_decreasing";
    } else if (hist > 0) {
      status = "bullish";
      statusLabel = "Histogram Positive";
      interpretation = "early_bullish";
    } else if (hist < 0) {
      status = "bearish";
      statusLabel = "Histogram Negative";
      interpretation = "early_bearish";
    } else {
      status = "neutral";
      statusLabel = "Converging";
      interpretation = "crossover_forming";
    }

    items.push({ key: "macd", label: "MACD", value: statusLabel, status, statusLabel, interpretation });
  }

  // ── ADX ──────────────────────────────────────────────────────────────
  {
    const val = adx.adx.toFixed(1);
    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (adx.adx >= 40) {
      status = "bullish";
      statusLabel = "Very Strong Trend";
      interpretation = "high_conviction";
    } else if (adx.adx >= 25) {
      status = adx.plusDI > adx.minusDI ? "bullish" : "bearish";
      statusLabel = "Strong Trend";
      interpretation = adx.plusDI > adx.minusDI ? "buyers_in_control" : "sellers_in_control";
    } else if (adx.adx >= 20) {
      status = "neutral";
      statusLabel = "Moderate Trend";
      interpretation = "trend_developing";
    } else {
      status = "neutral";
      statusLabel = "Weak Trend";
      interpretation = "market_ranging";
    }

    items.push({ key: "adx", label: "ADX", value: val, status, statusLabel, interpretation });
  }

  // ── EMA Alignment ────────────────────────────────────────────────────
  {
    const bullishAlign = ema20 > ema50;
    const bearishAlign = ema20 < ema50;

    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (bullishAlign) {
      status = "bullish";
      statusLabel = "Bullish Alignment";
      interpretation = "uptrend";
    } else if (bearishAlign) {
      status = "bearish";
      statusLabel = "Bearish Alignment";
      interpretation = "downtrend";
    } else {
      status = "neutral";
      statusLabel = "Mixed";
      interpretation = "no_clear_trend";
    }

    items.push({ key: "ema", label: "EMA", value: statusLabel, status, statusLabel, interpretation });
  }

  // ── ATR ──────────────────────────────────────────────────────────────
  {
    const atrPct = currentPrice > 0 ? (atr_val / currentPrice) * 100 : 0;
    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (atrPct > 5) {
      status = "bearish";
      statusLabel = "High Volatility";
      interpretation = "wide_stops";
    } else if (atrPct > 2) {
      status = "neutral";
      statusLabel = "Medium Volatility";
      interpretation = "normal_conditions";
    } else {
      status = "bullish";
      statusLabel = "Low Volatility";
      interpretation = "breakout_building";
    }

    items.push({ key: "atr", label: "ATR", value: statusLabel, status, statusLabel, interpretation });
  }

  // ── Bollinger Bands ──────────────────────────────────────────────────
  {
    let status: "bullish" | "bearish" | "neutral";
    let statusLabel: string;
    let interpretation: string;

    if (bb.pricePosition === "above") {
      status = "bearish";
      statusLabel = "Above Upper Band";
      interpretation = "price_extended";
    } else if (bb.pricePosition === "below") {
      status = "bullish";
      statusLabel = "Below Lower Band";
      interpretation = "potential_bounce";
    } else {
      status = "neutral";
      statusLabel = "Inside Bands";
      interpretation = "normal_range";
    }

    items.push({ key: "bb", label: "Bollinger", value: statusLabel, status, statusLabel, interpretation });
  }

  return items;
}

function mapSignalType(signal: TradingSignalOutput["signal"]): TradingSignalType {
  const map: Record<string, TradingSignalType> = {
    strong_buy: "Strong Buy",
    buy: "Buy",
    neutral: "Neutral",
    sell: "Sell",
    strong_sell: "Strong Sell",
  };
  return map[signal] ?? "Neutral";
}

const STATUS_KEY_MAP: Record<string, string> = {
  "Strong Bullish": "strong_bullish",
  "Bullish": "bullish",
  "Neutral": "neutral",
  "Bearish": "bearish",
  "Strong Bearish": "strong_bearish",
};

function buildScores(
  scores: ScoreEngineOutput,
  t: (key: string, params?: Record<string, string | number>) => string,
): CoinAnalysisState["scores"] {
  const b = scores.breakdown;
  const translateStatus = (status: string) => {
    const key = STATUS_KEY_MAP[status];
    return key ? t(`coin_analysis.score.status.${key}`) : status;
  };
  return {
    trend: { value: b.trend.value, title: translateStatus(b.trend.status), reasons: b.trend.factors.map((f) => f.reason) },
    momentum: { value: b.momentum.value, title: translateStatus(b.momentum.status), reasons: b.momentum.factors.map((f) => f.reason) },
    volume: { value: b.volume.value, title: translateStatus(b.volume.status), reasons: b.volume.factors.map((f) => f.reason) },
    volatility: { value: b.volatility.value, title: translateStatus(b.volatility.status), reasons: b.volatility.factors.map((f) => f.reason) },
    risk: { value: b.risk.value, title: translateStatus(b.risk.status), reasons: b.risk.factors.map((f) => f.reason) },
  };
}

function buildExplanation(
  scores: CoinAnalysisState["scores"],
  overallValue: number,
  signal: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): CoinAnalysisState["explanation"] {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const risks: string[] = [];

  const high = Object.entries(scores).filter(([, s]) => s.value >= 65);
  const low = Object.entries(scores).filter(([, s]) => s.value <= 40);

  for (const [key, s] of high) {
    strengths.push(
      t("coin_analysis.explanation.dimension_score", {
        dimension: t(`coin_analysis.score.${key}`),
        status: s.title,
        value: String(s.value),
      }),
    );
  }
  for (const [key, s] of low) {
    weaknesses.push(
      t("coin_analysis.explanation.dimension_score", {
        dimension: t(`coin_analysis.score.${key}`),
        status: s.title,
        value: String(s.value),
      }),
    );
  }

  if (scores.risk.value >= 65) {
    strengths.push(t("coin_analysis.explanation.risk_low"));
  } else if (scores.risk.value <= 40) {
    risks.push(t("coin_analysis.explanation.risk_elevated"));
  }

  const isStrong = overallValue >= 65 && high.length >= 2;
  const isWeak = overallValue <= 40 || low.length >= 2;

  let recommendation: string;
  if (isStrong) {
    recommendation = t("coin_analysis.recommendation.open_detail");
  } else if (isWeak) {
    recommendation = t("coin_analysis.recommendation.wait_detail");
  } else {
    recommendation = t("coin_analysis.recommendation.neutral_detail");
  }

  const summary = strengths.length > 0
    ? t("coin_analysis.explanation.summary_signals", {
        strengths: String(strengths.length),
        weaknesses: String(weaknesses.length),
        score: String(overallValue),
        signal,
      })
    : t("coin_analysis.explanation.summary_no_signals", {
        score: String(overallValue),
        signal,
      });

  return { summary, strengths, weaknesses, risks, recommendation };
}

/* ── Per-timeframe Trend Analysis ─────────────────────────────────────── */

function computeTimeframeTrend(closes: readonly number[]): { trend: string; confidence: number } {
  const minBars = 20;
  if (closes.length < minBars) {
    return { trend: "Neutral", confidence: 50 };
  }

  const ema9Arr = calcEma(closes, 9);
  const ema21Arr = calcEma(closes, 21);
  const ema50Arr = calcEma(closes, Math.min(50, closes.length));

  const ema9 = ema9Arr[ema9Arr.length - 1];
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];

  const bullish = ema9 > ema21;
  const bearish = ema9 < ema21;
  const emaAlignedBull = bullish && ema21 > ema50;
  const emaAlignedBear = bearish && ema21 < ema50;

  // Price momentum (recent change)
  const recentChange = ((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]) * 100;

  let trend: string;
  if (emaAlignedBull && recentChange > 2) trend = "Strong Bullish";
  else if (emaAlignedBull) trend = "Bullish";
  else if (emaAlignedBear && recentChange < -2) trend = "Strong Bearish";
  else if (emaAlignedBear) trend = "Bearish";
  else if (bullish && recentChange > 1) trend = "Bullish";
  else if (bearish && recentChange < -1) trend = "Bearish";
  else trend = "Neutral";

  // Confidence: EMA separation + momentum alignment
  const emaSeparation = Math.abs(ema9 - ema21) / ema21;
  let confidence = 50;
  if (emaAlignedBull || emaAlignedBear) confidence += 15;
  if (emaSeparation > 0.01) confidence += 10;
  if (Math.abs(recentChange) > 3) confidence += 10;
  else if (Math.abs(recentChange) > 1) confidence += 5;
  if ((trend.startsWith("Bullish") || trend.startsWith("Strong Bullish")) && recentChange > 0) confidence += 5;
  if ((trend.startsWith("Bearish") || trend.startsWith("Strong Bearish")) && recentChange < 0) confidence += 5;

  // Volatility dampener
  const volatility = calcEma(closes.map(c => Math.abs(c - closes[closes.length - 1]) / closes[closes.length - 1]), 14);
  const vol = volatility[volatility.length - 1] ?? 0;
  if (vol > 0.05) confidence -= 10;
  else if (vol < 0.01) confidence += 5;

  return { trend, confidence: Math.max(0, Math.min(100, Math.round(confidence))) };
}

function buildTrends(
  market: ReturnType<typeof useAnalysis>["market"],
  activeTimeframe: string,
): readonly TimeframeTrendData[] {
  if (!market) return [];

  const tfs = ["15m", "1h", "4h", "1d"] as const;
  const results: TimeframeTrendData[] = [];

  for (const tf of tfs) {
    let closes: number[];

    if (tf === "15m") {
      // Approximate 15m using 1h data with shorter window (last 6 candles ≈ short-term)
      const hourly = market.candles["1h"];
      if (hourly.length < 4) continue;
      closes = hourly.slice(-20).map(c => c.close);
    } else if (tf === "1h") {
      const hourly = market.candles["1h"];
      if (hourly.length < 20) continue;
      closes = hourly.map(c => c.close);
    } else if (tf === "4h") {
      const fourHourly = market.candles["4h"];
      if (fourHourly.length < 10) continue;
      closes = fourHourly.map(c => c.close);
    } else {
      const daily = market.candles["1d"];
      if (daily.length < 10) continue;
      closes = daily.map(c => c.close);
    }

    const { trend, confidence } = computeTimeframeTrend(closes);
    results.push({ timeframe: tf, trend, confidence, isActive: tf === activeTimeframe });
  }

  return results;
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useCoinAnalysis(coinId: string | null, interval: string = "1h"): CoinAnalysisState {
  const { t } = useI18n();
  const { market, scores, signal, isLoading: dashLoading, error: dashError } = useAnalysis(coinId);

  /* ── Status ─────────────────────────────────────────────────────────── */
  const status: CoinAnalysisState["status"] = (() => {
    if (dashLoading) return "loading";
    if (dashError) return "error";
    if (!market || !scores) return "noResult";
    return "ready";
  })();

  /* ── Technical Indicators ──────────────────────────────────────────── */
  const rawIndicators = useMemo(() => {
    if (!market) return null;
    try { return computeIndicators(market); } catch { return null; }
  }, [market]);

  const indicatorItems = useMemo(() => {
    if (!rawIndicators) return [] as readonly IndicatorItem[];
    return buildIndicatorItems(rawIndicators, market?.price.current ?? 0);
  }, [rawIndicators, market?.price.current]);

  /* ── Derived State ──────────────────────────────────────────────────── */
  const marketCard = useMemo(() => buildMarketCard(market, interval), [market, interval]);
  const indicators = indicatorItems;
  const trends = useMemo(() => buildTrends(market, interval), [market, interval]);

  const computedScores = useMemo(
    () => (scores ? buildScores(scores, t) : null),
    [scores, t],
  );

  const computedSignal = useMemo(() => {
    if (!signal) return { type: "Neutral" as TradingSignalType };
    return { type: mapSignalType(signal.signal) };
  }, [signal]);

  /* ── Trade Setup ────────────────────────────────────────────────────── */
  const computedTradeSetup = useMemo(() => {
    if (!market || !scores || !signal || !rawIndicators) return null;
    try {
      return buildTradeSetup(market, scores, signal, rawIndicators);
    } catch {
      return null;
    }
  }, [market, scores, signal, rawIndicators]);

  const tradeState = useMemo(() => {
    const ts = computedTradeSetup;
    if (!ts) return { hasTrade: false, tradeReason: "No trade data available.", tradeSetup: { hasTrade: false } as const };

    if (!ts.hasTrade) {
      return {
        hasTrade: false,
        tradeReason: ts.validation.reason ?? "No valid trade setup.",
        tradeSetup: {
          hasTrade: false,
          reason: ts.validation.reason ?? "No valid trade setup.",
          direction: ts.direction,
        } as const,
      };
    }

    return {
      hasTrade: true,
      tradeReason: undefined as string | undefined,
      tradeSetup: {
        hasTrade: true,
        direction: ts.direction,
        entry: ts.entry,
        stopLoss: ts.stopLoss,
        takeProfit: {
          tp1: ts.takeProfit.tp1,
          tp2: ts.takeProfit.tp2,
          tp3: ts.takeProfit.tp3,
        },
        riskReward: {
          tp1: ts.riskReward.tp1,
          tp2: ts.riskReward.tp2,
          tp3: ts.riskReward.tp3,
        },
        expectedProfit: {
          tp1: ts.expectedProfit.tp1,
          tp2: ts.expectedProfit.tp2,
          tp3: ts.expectedProfit.tp3,
        },
        risk: ts.position.riskAmount,
        tradeQuality: ts.tradeQuality,
      } as const,
    };
  }, [computedTradeSetup]);

  const computedConfidence = scores?.confidence ?? 0;
  const computedTradeQuality = tradeState.hasTrade && tradeState.tradeSetup.tradeQuality
    ? tradeState.tradeSetup.tradeQuality
    : 0;

  if (!computedScores) {
    return {
      status,
      error: dashError ? String(dashError) : null,
      scores: {
        trend: { value: 0, title: "—", reasons: [] },
        momentum: { value: 0, title: "—", reasons: [] },
        volume: { value: 0, title: "—", reasons: [] },
        volatility: { value: 0, title: "—", reasons: [] },
        risk: { value: 0, title: "—", reasons: [] },
      },
      overallScore: { value: 0, signal: "Neutral", weights: { trend: 0.35, momentum: 0.20, volume: 0.15, volatility: 0.10, risk: 0.20 } },
      signal: computedSignal,
      hasTrade: tradeState.hasTrade,
      tradeReason: tradeState.tradeReason,
      tradeSetup: tradeState.tradeSetup,
      confidence: computedConfidence,
      tradeQuality: computedTradeQuality,
      market: marketCard,
      indicators,
      trends,
      explanation: {
        summary: "—",
        strengths: [],
        weaknesses: [],
        risks: [],
        recommendation: "—",
      },
    };
  }

  const overallScoreValue = scores?.overall ?? 0;
  const overallSignal = mapSignalType(signal?.signal ?? "neutral");

  const explanation = buildExplanation(computedScores, overallScoreValue, overallSignal, t);

  return {
    status,
    error: dashError ? String(dashError) : null,
    scores: computedScores,
    overallScore: {
      value: overallScoreValue,
      signal: overallSignal,
      weights: { trend: 0.35, momentum: 0.20, volume: 0.15, volatility: 0.10, risk: 0.20 },
    },
    signal: computedSignal,
    hasTrade: tradeState.hasTrade,
    tradeReason: tradeState.tradeReason,
    tradeSetup: tradeState.tradeSetup,
    confidence: computedConfidence,
    tradeQuality: computedTradeQuality,
    market: marketCard,
    indicators,
    trends,
    explanation,
  };
}

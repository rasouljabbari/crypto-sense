"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { useAnalysis } from "@/features/analysis-engine/hooks/useAnalysis";
import { supportResistance } from "@/features/analysis-engine/indicators";
import type { CoinAnalysisState, MarketCardData, IndicatorItem } from "../types";
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

function getNearestSR(market: ReturnType<typeof useAnalysis>["market"]): Pick<MarketCardData, "nearestSupport" | "nearestResistance"> {
  if (!market) return {};

  const candles = market.candles["1h"];
  if (candles.length < 20) return {};

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const currentPrice = market.price.current;

  const { supportLevels, resistanceLevels } = supportResistance(highs, lows, closes);

  const nearestSupport = supportLevels.length > 0 ? fmtPrice(supportLevels[0]) : undefined;
  const nearestResistance = resistanceLevels.length > 0 ? fmtPrice(resistanceLevels[0]) : undefined;

  return { nearestSupport, nearestResistance };
}

function buildMarketCard(
  market: ReturnType<typeof useAnalysis>["market"]
): MarketCardData {
  const p = market?.price;
  const sr = getNearestSR(market);

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
  };
}

function buildIndicatorItems(): readonly IndicatorItem[] {
  return [];
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

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useCoinAnalysis(coinId: string | null): CoinAnalysisState {
  const { t } = useI18n();
  const { market, scores, signal, isLoading: dashLoading, error: dashError } = useAnalysis(coinId);

  /* ── Status ─────────────────────────────────────────────────────────── */
  const status: CoinAnalysisState["status"] = (() => {
    if (dashLoading) return "loading";
    if (dashError) return "error";
    if (!market || !scores) return "noResult";
    return "ready";
  })();

  /* ── Derived State ──────────────────────────────────────────────────── */
  const marketCard = useMemo(() => buildMarketCard(market), [market]);
  const indicators = useMemo(() => buildIndicatorItems(), []);

  const computedScores = useMemo(
    () => (scores ? buildScores(scores, t) : null),
    [scores, t],
  );

  const computedSignal = useMemo(() => {
    if (!signal) return { type: "Neutral" as TradingSignalType };
    return { type: mapSignalType(signal.signal) };
  }, [signal]);

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
      hasTrade: false,
      tradeReason: "No trade generated.",
      tradeSetup: { hasTrade: false },
      market: marketCard,
      indicators,
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
    hasTrade: false,
    tradeReason: "No trade generated.",
    tradeSetup: { hasTrade: false },
    market: marketCard,
    indicators,
    explanation,
  };
}

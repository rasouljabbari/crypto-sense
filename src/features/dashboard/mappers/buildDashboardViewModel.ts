import type { TradeSetupResult } from "indicator-engine/risk-management-engine";
import type { IndicatorInput } from "@/features/analysis-engine/services/scoring";
import type { ScoreEngineOutput } from "@/features/analysis-engine/services/scoring";
import type { TradingSignalOutput } from "@/features/analysis-engine/services/signaling";
import type { MarketSnapshot } from "@/features/analysis-engine/types";
import type { DashboardViewModel, FactorItem, IndicatorItem } from "../types";
import { DIMENSION_COLORS } from "./constants";
import {
  formatContribution,
  formatFactorName,
  formatPercent,
  formatPrice,
  formatRiskReward,
} from "./formatters";

type TranslateFn = (path: string) => string;

function scoreValueColor(value: number): string {
  if (value >= 60) return "text-emerald-400";
  if (value <= 40) return "text-red-400";
  return "text-yellow-400";
}

function trendBarGradient(value: number): string {
  if (value >= 60) return "linear-gradient(90deg, #34d399, #22d3ee)";
  if (value <= 40) return "linear-gradient(90deg, #f87171, #fb923c)";
  return "linear-gradient(90deg, #facc15, #facc15)";
}

function riskBarGradient(score: number): string {
  if (score >= 60) return "linear-gradient(90deg, #f87171, #34d399)";
  return "linear-gradient(90deg, #f87171, #fb923c)";
}

function mapFactors(
  factors: readonly { name: string; contribution: number }[],
  suffix = "",
): FactorItem[] {
  return factors.map((f) => ({
    name: formatFactorName(f.name),
    contribution: f.contribution,
    contributionLabel: formatContribution(f.contribution, suffix),
  }));
}

function buildIndicators(
  indicators: IndicatorInput,
  currentPrice: number,
  t: TranslateFn,
): IndicatorItem[] {
  const adxTrendLabel =
    indicators.adx.trend === "ranging"
      ? t("dashboard.trend.ranging")
      : indicators.adx.trend === "strong"
        ? t("dashboard.trend.strong")
        : t("dashboard.trend.trending");

  return [
    {
      key: "rsi",
      label: t("dashboard.technical.rsi"),
      value: indicators.rsi.value.toFixed(1),
      status: indicators.rsi.overbought || indicators.rsi.oversold ? "warning" : "neutral",
      statusLabel: indicators.rsi.overbought
        ? t("dashboard.technical.overbought")
        : indicators.rsi.oversold
          ? t("dashboard.technical.oversold")
          : t("dashboard.trend.neutral"),
    },
    {
      key: "macd",
      label: t("dashboard.technical.macd"),
      value: indicators.macd.value.toFixed(2),
      status: indicators.macd.bullish ? "positive" : "negative",
      statusLabel: indicators.macd.bullish
        ? t("dashboard.technical.bullish")
        : t("dashboard.technical.bearish"),
    },
    {
      key: "adx",
      label: "ADX",
      value: indicators.adx.adx.toFixed(1),
      status: indicators.adx.trend === "ranging" ? "neutral" : "positive",
      statusLabel: adxTrendLabel,
    },
    {
      key: "ema20",
      label: "EMA 20",
      value: formatPrice(indicators.ema20.value),
      status: indicators.ema20.value > currentPrice ? "negative" : "positive",
      statusLabel: indicators.ema20.value > currentPrice
        ? t("dashboard.technical.above")
        : t("dashboard.technical.below"),
    },
    {
      key: "ema50",
      label: "EMA 50",
      value: formatPrice(indicators.ema50.value),
      status: indicators.ema50.value > currentPrice ? "negative" : "positive",
      statusLabel: indicators.ema50.value > currentPrice
        ? t("dashboard.technical.above")
        : t("dashboard.technical.below"),
    },
    {
      key: "bollinger",
      label: t("dashboard.technical.bollinger"),
      value: formatPrice(indicators.bollingerBands.middle),
      status: indicators.bollingerBands.pricePosition === "inside"
        ? "neutral"
        : indicators.bollingerBands.pricePosition === "above"
          ? "positive"
          : "negative",
      statusLabel: t(`dashboard.technical.${indicators.bollingerBands.pricePosition}`),
    },
    {
      key: "atr",
      label: "ATR",
      value: formatPrice(indicators.atr.value),
      status: "neutral",
      statusLabel: "—",
    },
    {
      key: "obv",
      label: "OBV",
      value: indicators.obv.trend,
      status: indicators.obv.trend === "rising"
        ? "positive"
        : indicators.obv.trend === "falling"
          ? "negative"
          : "neutral",
      statusLabel: indicators.obv.trend,
    },
  ];
}

export function buildDashboardViewModel(
  market: MarketSnapshot,
  scores: ScoreEngineOutput,
  signal: TradingSignalOutput,
  indicators: IndicatorInput,
  tradeSetup: TradeSetupResult,
  t: TranslateFn,
): DashboardViewModel {
  const trend = scores.breakdown.trend;
  const confidence = scores.breakdown.confidence;
  const risk = scores.breakdown.risk;

  const dimensionKeys = [
    "technical",
    "trend",
    "momentum",
    "volume",
    "sentiment",
    "risk",
    "confidence",
  ] as const;

  const riskPercent =
    tradeSetup.entry > 0
      ? (Math.abs(tradeSetup.entry - tradeSetup.stopLoss) / tradeSetup.entry) * 100
      : 0;

  return {
    cryptoScore: {
      overall: scores.overall,
      dimensions: dimensionKeys.map((key) => ({
        key,
        label: t(`dashboard.score.${key}`),
        value: scores[key],
        color: DIMENSION_COLORS[key] ?? "#6b7280",
      })),
    },
    signal: {
      type: signal.signal,
      label: t(`dashboard.signal.${signal.signal}`),
      factors: mapFactors(signal.factors),
    },
    confidence: {
      value: scores.confidence,
      label: confidence.label,
      barColor: "#22d3ee",
      factors: mapFactors(confidence.factors, "pts"),
    },
    risk: {
      score: scores.risk,
      barGradient: riskBarGradient(scores.risk),
      factors: mapFactors(risk.factors),
    },
    trend: {
      value: trend.value,
      valueClassName: scoreValueColor(trend.value),
      barGradient: trendBarGradient(trend.value),
      directionLabel: t(`dashboard.trend.${indicators.trendDirection}`),
      factors: mapFactors(trend.factors.slice(0, 3), "pts"),
    },
    entry: {
      price: formatPrice(tradeSetup.entry),
      direction: tradeSetup.direction,
      directionLabel: t(`dashboard.trade.${tradeSetup.direction}`),
      isValid: tradeSetup.validation.isValid,
      reason: tradeSetup.validation.reason,
    },
    takeProfit: {
      levels: [
        {
          label: "TP1",
          price: formatPrice(tradeSetup.takeProfit.tp1),
          riskReward: formatRiskReward(tradeSetup.riskReward.tp1),
        },
        {
          label: "TP2",
          price: formatPrice(tradeSetup.takeProfit.tp2),
          riskReward: formatRiskReward(tradeSetup.riskReward.tp2),
        },
        {
          label: "TP3",
          price: formatPrice(tradeSetup.takeProfit.tp3),
          riskReward: formatRiskReward(tradeSetup.riskReward.tp3),
        },
      ],
      isValid: tradeSetup.validation.isValid,
      reason: tradeSetup.validation.reason,
    },
    stopLoss: {
      price: formatPrice(tradeSetup.stopLoss),
      riskAmount: formatPrice(tradeSetup.risk),
      riskPercent: formatPercent(riskPercent),
      isValid: tradeSetup.validation.isValid,
      reason: tradeSetup.validation.reason,
    },
    indicators: {
      items: buildIndicators(indicators, market.price.current, t),
    },
  };
}

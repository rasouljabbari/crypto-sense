"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { useAnalysis } from "@/features/analysis-engine/hooks/useAnalysis";
import { computeIndicators } from "@/features/analysis-engine/hooks/_computeIndicators";
import { buildTradeSetup } from "@/features/analysis-engine/services/tradeSetup";
import { generateExplanation } from "@/features/analysis-engine/services/explanation";
import { buildDashboardViewModel } from "@/features/dashboard/mappers/buildDashboardViewModel";
import type { CoinAnalysisState, DimensionScore, MarketCardData, IndicatorItem } from "../types";

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function buildMarketCard(
  market: ReturnType<typeof useAnalysis>["market"],
  vm: ReturnType<typeof buildDashboardViewModel> | null,
): MarketCardData {
  const p = market?.price;

  return {
    price: vm?.entry.price ?? "—",
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
    trend: vm?.trend.directionLabel ?? "—",
    trendStatus: vm
      ? vm.trend.value >= 60
        ? "bullish"
        : vm.trend.value <= 40
          ? "bearish"
          : "neutral"
      : "neutral",
    volatility: "—",
    volatilityStatus: "medium",
  };
}

function buildIndicatorItems(
  vm: ReturnType<typeof buildDashboardViewModel> | null,
): readonly IndicatorItem[] {
  if (!vm) return [];
  return vm.indicators.items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    status: item.status,
    statusLabel: item.statusLabel,
  }));
}

function buildDimensions(
  vm: ReturnType<typeof buildDashboardViewModel> | null,
): readonly DimensionScore[] {
  if (!vm) return [];
  const keys = ["trend", "momentum", "volume", "volatility", "risk"] as const;
  return keys.map((key) => {
    const dim = vm.dimensionScores[key];
    return {
      key,
      label: dim.label,
      value: dim.value,
      status: dim.status,
      explanation: dim.explanation,
      reasons: dim.reasons,
    };
  });
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

export function useCoinAnalysis(coinId: string | null): CoinAnalysisState {
  const { t } = useI18n();
  const { market, scores, signal, isLoading: dashLoading, error: dashError } = useAnalysis(coinId);

  /* ── Build view model (same as useDashboard) ─────────────────────────── */
  const viewModel = useMemo(() => {
    if (!market || !scores || !signal) return null;
    const indicators = computeIndicators(market);
    const tradeSetup = buildTradeSetup(market, scores, signal, indicators);
    return buildDashboardViewModel(market, scores, signal, indicators, tradeSetup, t);
  }, [market, scores, signal, t]);

  /* ── Rule-based explanation (no LLM, no API call) ───────────────────── */
  const explanation = useMemo(() => {
    if (!market || !scores) return null;
    const indicators = computeIndicators(market);
    return generateExplanation(scores, indicators, market);
  }, [market, scores]);

  /* ── Status machine ──────────────────────────────────────────────────── */
  const status: CoinAnalysisState["status"] = (() => {
    if (dashLoading) return "loading";
    if (dashError) return "error";
    if (!viewModel) return "noResult";
    return "ready";
  })();

  /* ── Derived state ───────────────────────────────────────────────────── */
  const marketCard = useMemo(() => buildMarketCard(market, viewModel), [market, viewModel]);
  const indicators = useMemo(() => buildIndicatorItems(viewModel), [viewModel]);
  const dimensions = useMemo(() => buildDimensions(viewModel), [viewModel]);

  return {
    status,
    error: dashError,
    overall: viewModel?.cryptoScore.overall ?? 0,
    signal: viewModel?.signal.type ?? "neutral",
    confidence: viewModel?.confidence.value ?? 0,
    dimensions,
    hasTrade: viewModel?.entry.isValid ?? false,
    tradeReason: viewModel?.entry.reason ?? null,
    entry: viewModel?.entry.price ?? "—",
    entryDirection: viewModel?.entry.direction ?? "long",
    entryDirectionLabel: viewModel?.entry.directionLabel ?? "—",
    stopLoss: viewModel?.stopLoss.price ?? "—",
    takeProfit: {
      tp1: viewModel?.takeProfit.levels[0]?.price ?? "—",
      tp2: viewModel?.takeProfit.levels[1]?.price ?? "—",
      tp3: viewModel?.takeProfit.levels[2]?.price ?? "—",
    },
    market: marketCard,
    indicators,
    explanation,
  };
}

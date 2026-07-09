"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/context";
import { useAnalysis } from "@/features/analysis-engine/hooks";
import { computeIndicators } from "@/features/analysis-engine/hooks/_computeIndicators";
import { buildTradeSetup } from "@/features/analysis-engine/services/tradeSetup";
import { buildDashboardViewModel } from "../mappers/buildDashboardViewModel";
import type { DashboardViewModel } from "../types";

export interface DashboardState {
  readonly viewModel: DashboardViewModel | null;
  readonly coinId: string;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

export function useDashboard(coinId: string | null): DashboardState {
  const { t } = useI18n();
  const { market, scores, signal, isLoading, error } = useAnalysis(coinId);

  const viewModel = useMemo(() => {
    if (!market || !scores || !signal) return null;

    const indicators = computeIndicators(market);
    const tradeSetup = buildTradeSetup(market, scores, signal, indicators);

    return buildDashboardViewModel(market, scores, signal, indicators, tradeSetup, t);
  }, [market, scores, signal, t]);

  return {
    viewModel,
    coinId: coinId ?? "",
    isLoading,
    error,
  };
}

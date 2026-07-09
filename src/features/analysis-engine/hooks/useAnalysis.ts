// ---------------------------------------------------------------------------
// useAnalysis — orchestrator hook
// Combines market, scores, signal, and news into a single reactive view.
// ---------------------------------------------------------------------------

"use client";

import { useMarket } from "./useMarket";
import { useScore } from "./useScore";
import { useSignal } from "./useSignal";
import { useNews } from "./useNews";
import type { MarketSnapshot } from "../types";
import type { ScoreEngineOutput } from "../services/scoring";
import type { TradingSignalOutput } from "../services/signaling";
import type { NewsEngineOutput } from "../services/newsEngine";

export interface AnalysisResult {
  readonly market: MarketSnapshot | undefined;
  readonly scores: ScoreEngineOutput | undefined;
  readonly signal: TradingSignalOutput | undefined;
  readonly news: NewsEngineOutput | undefined;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly error: Error | null;
}

export function useAnalysis(coinId: string | null): AnalysisResult {
  const market = useMarket(coinId);
  const scores = useScore(market.data);
  const signal = useSignal(scores.data);
  const news = useNews(coinId);

  const isLoading =
    coinId !== null && (market.isLoading || scores.isLoading);

  const isFetching =
    market.isFetching || scores.isFetching || signal.isFetching || news.isFetching;

  const error = market.error ?? scores.error;

  return {
    market: market.data,
    scores: scores.data,
    signal: signal.data,
    news: news.data,
    isLoading,
    isFetching,
    error,
  };
}

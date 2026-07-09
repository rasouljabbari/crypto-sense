// ---------------------------------------------------------------------------
// useScore — computes indicators + scores from a MarketSnapshot
// ---------------------------------------------------------------------------

"use client";

import { useQuery } from "@tanstack/react-query";
import { calculateScores } from "../services";
import type { MarketSnapshot } from "../types";
import type { ScoreEngineOutput, SentimentInput } from "../services/scoring";
import { computeIndicators } from "./_computeIndicators";

export function useScore(
  snapshot: MarketSnapshot | undefined,
  sentiment?: SentimentInput,
  marketCap?: number,
) {
  return useQuery<ScoreEngineOutput>({
    queryKey: scoreKeys.detail(snapshot?.coinId ?? "_", snapshot?.fetchedAt ?? "_"),
    queryFn: () => {
      const indicators = computeIndicators(snapshot!);
      return calculateScores({
        indicators,
        price: {
          currentPrice: snapshot!.price.current,
          priceChangePercent24h: snapshot!.price.changePercent24h,
          volume24h: snapshot!.price.volume24h,
          marketCap: marketCap ?? 0,
        },
        sentiment: sentiment ?? {
          fearGreedScore: null,
          newsScore: null,
          newsPositiveRatio: null,
          newsArticleCount: null,
        },
      });
    },
    enabled: !!snapshot,
    staleTime: Infinity,
  });
}

export const scoreKeys = {
  all: ["score"] as const,
  detail: (coinId: string, fetchedAt: string) => ["score", coinId, fetchedAt] as const,
};

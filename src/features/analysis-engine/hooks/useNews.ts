// ---------------------------------------------------------------------------
// useNews — fetches and processes news for a coin
// ---------------------------------------------------------------------------

"use client";

import { useQuery } from "@tanstack/react-query";
import { NewsEngine } from "../services";
import type { NewsEngineOutput } from "../services/newsEngine";

const engine = new NewsEngine();

export function useNews(coinId: string | null) {
  return useQuery<NewsEngineOutput>({
    queryKey: newsKeys.detail(coinId ?? "_"),
    queryFn: () => engine.analyzeForCoin(coinId!),
    enabled: !!coinId,
    staleTime: 60_000,
    retry: 2,
  });
}

export const newsKeys = {
  all: ["news"] as const,
  detail: (coinId: string) => ["news", coinId] as const,
};

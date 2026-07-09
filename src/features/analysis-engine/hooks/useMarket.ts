// ---------------------------------------------------------------------------
// useMarket — fetches MarketSnapshot for a coin
// ---------------------------------------------------------------------------

"use client";

import { useQuery } from "@tanstack/react-query";
import { MarketEngine } from "../services";
import type { MarketSnapshot } from "../types";

const engine = new MarketEngine();

export function useMarket(coinId: string | null) {
  return useQuery<MarketSnapshot>({
    queryKey: marketKeys.detail(coinId ?? "_"),
    queryFn: () => engine.getSnapshot(coinId!),
    enabled: !!coinId,
    staleTime: 30_000,
    retry: 2,
    refetchInterval: 60_000,
  });
}

export const marketKeys = {
  all: ["market"] as const,
  detail: (coinId: string) => ["market", coinId] as const,
};

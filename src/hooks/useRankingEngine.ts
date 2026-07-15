"use client";

import { useState, useEffect, useCallback } from "react";
import { RankingResult, fetchAndRankCoins } from "@/lib/rankingEngine";

const POLL_INTERVAL = 5 * 60 * 1000;

export function useRankingEngine() {
  const [result, setResult] = useState<RankingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAndRankCoins();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ranking engine failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return { result, loading, error, refresh };
}

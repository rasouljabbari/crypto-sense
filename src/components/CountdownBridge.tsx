"use client";

import { useCallback } from "react";
import { CountdownProviderWithRefresh } from "@/lib/countdown-context";
import { useStore } from "@/store/useStore";

/**
 * Client-side bridge that wires the countdown timer to the Zustand store.
 * Placed inside the layout to wrap all children.
 */
export function CountdownBridge({ children }: { children: React.ReactNode }) {
  const refreshWithTimeframe = useStore((s) => s.refreshWithTimeframe);
  const timeframe = useStore((s) => s.timeframe);
  const coins = useStore((s) => s.coins);

  const handleCandleClose = useCallback(() => {
    // Only refresh if we have coins loaded
    if (coins.length > 0) {
      refreshWithTimeframe(timeframe);
    }
  }, [refreshWithTimeframe, timeframe, coins.length]);

  return (
    <CountdownProviderWithRefresh onCandleClose={handleCandleClose}>
      {children}
    </CountdownProviderWithRefresh>
  );
}

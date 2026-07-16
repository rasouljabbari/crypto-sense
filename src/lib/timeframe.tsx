"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useStore } from "@/store/useStore";
import type { Timeframe } from "@/lib/types";

// ─── Supported Timeframes ──────────────────────────────────────────────────

export type TimeframeOption = "15m" | "1h" | "4h" | "1d";

export const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string; limit: number }[] = [
  { value: "15m", label: "15M", limit: 1000 },
  { value: "1h", label: "1H", limit: 1000 },
  { value: "4h", label: "4H", limit: 1000 },
  { value: "1d", label: "1D", limit: 1000 },
];

export const DEFAULT_TIMEFRAME: TimeframeOption = "1h";

// ─── Context Shape ─────────────────────────────────────────────────────────

interface TimeframeContextValue {
  /** Current active timeframe */
  readonly timeframe: TimeframeOption;
  /** Switch to a new global timeframe — triggers re-analysis */
  readonly setTimeframe: (tf: TimeframeOption) => void;
  /** Resolve the kline limit for the current timeframe */
  readonly getLimit: () => number;
}

const TimeframeContext = createContext<TimeframeContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function TimeframeProvider({ children }: { children: React.ReactNode }) {
  const storeTf = useStore((s) => s.timeframe);
  const storeSetTf = useStore((s) => s.setTimeframe);

  // Clamp store value to our supported set (handles legacy "1w"/"1M" in localStorage)
  const timeframe: TimeframeOption =
    storeTf === "15m" || storeTf === "1h" || storeTf === "4h" || storeTf === "1d"
      ? storeTf
      : DEFAULT_TIMEFRAME;

  const setTimeframe = useCallback(
    (tf: TimeframeOption) => {
      storeSetTf(tf as Timeframe);
    },
    [storeSetTf]
  );

  const getLimit = useCallback(() => {
    const opt = TIMEFRAME_OPTIONS.find((o) => o.value === timeframe);
    return opt?.limit ?? 1000;
  }, [timeframe]);

  const value = useMemo(
    () => ({ timeframe, setTimeframe, getLimit }),
    [timeframe, setTimeframe, getLimit]
  );

  return (
    <TimeframeContext.Provider value={value}>
      {children}
    </TimeframeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useTimeframe(): TimeframeContextValue {
  const ctx = useContext(TimeframeContext);
  if (!ctx) {
    // Graceful fallback outside provider (SSR, tests)
    return {
      timeframe: DEFAULT_TIMEFRAME,
      setTimeframe: () => {},
      getLimit: () => 1000,
    };
  }
  return ctx;
}

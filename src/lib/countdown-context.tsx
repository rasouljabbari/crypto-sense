"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTimeframe } from "@/lib/timeframe";
import { secondsUntilNextClose, formatCountdown } from "@/lib/countdown";

// ─── Context Shape ─────────────────────────────────────────────────────────

interface CountdownContextValue {
  /** Raw seconds remaining. null = error/not computed. */
  readonly remaining: number | null;
  /** Formatted display string. "--" when unavailable. */
  readonly display: string;
  /** True when remaining ≤ 60s */
  readonly isUrgent: boolean;
  /** True when remaining ≤ 10s */
  readonly isCritical: boolean;
  /** Current epoch ms, updated every 1s tick. Single shared clock. */
  readonly now: number;
}

const CountdownContext = createContext<CountdownContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

/**
 * Single global countdown timer.
 * One setInterval ticking at 1Hz. All consumers share the same value.
 * Fires onCandleClose when countdown crosses zero.
 */
export function CountdownProviderWithRefresh({
  children,
  onCandleClose,
}: {
  children: React.ReactNode;
  onCandleClose?: () => void;
}) {
  const { timeframe } = useTimeframe();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const prevRemainingRef = useRef<number | null>(null);
  const onCandleCloseRef = useRef(onCandleClose);
  onCandleCloseRef.current = onCandleClose;

  // Single 1Hz tick
  useEffect(() => {
    prevRemainingRef.current = null; // reset on timeframe switch — prevent false close

    const tick = () => {
      const ts = Date.now();
      setNow(ts);
      const secs = secondsUntilNextClose(timeframe, ts);
      setRemaining(secs);

      // Detect zero crossing (candle just closed)
      if (
        secs !== null &&
        secs === 0 &&
        prevRemainingRef.current !== null &&
        prevRemainingRef.current > 0
      ) {
        onCandleCloseRef.current?.();
      } else if (
        // Handle mount-at-boundary: if first tick is 0 but no prev, fire callback
        secs !== null &&
        secs === 0 &&
        prevRemainingRef.current === null
      ) {
        onCandleCloseRef.current?.();
      }

      prevRemainingRef.current = secs;
    };

    tick(); // immediate first tick
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeframe]);

  const display = formatCountdown(remaining);
  const isUrgent = remaining !== null && remaining > 0 && remaining <= 60;
  const isCritical = remaining !== null && remaining > 0 && remaining <= 10;

  const value: CountdownContextValue = { remaining, display, isUrgent, isCritical, now };

  return (
    <CountdownContext.Provider value={value}>
      {children}
    </CountdownContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCountdown(): CountdownContextValue {
  const ctx = useContext(CountdownContext);

  if (!ctx) {
    return {
      remaining: null,
      display: "--",
      isUrgent: false,
      isCritical: false,
      now: Date.now(),
    };
  }

  return ctx;
}

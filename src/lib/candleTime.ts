"use client";

import { useEffect, useState } from "react";

/* ─── Candle Close Calculation ───────────────────────────────────────── */

const TIMEFRAME_MS: Record<string, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

/**
 * Safety margin (ms) after candle close before we consider it settled.
 * Exchanges need time to finalize the closed candle and update their APIs.
 * During this window the data may still reflect the previous candle or
 * a partial current candle.
 */
export const CANDLE_SETTLE_MS = 5_000; // 5 seconds

/**
 * Given a timeframe, return:
 *  - lastClosedAt: epoch ms of the last fully closed candle
 *  - nextCloseAt:  epoch ms of the next candle close
 */
export function getCandleCloseInfo(timeframe: string): {
  lastClosedAt: number;
  nextCloseAt: number;
} {
  const tfMs = TIMEFRAME_MS[timeframe];
  if (!tfMs) {
    // fallback: treat as 1h
    return getCandleCloseInfo("1h");
  }
  const now = Date.now();
  const lastClosedAt = Math.floor(now / tfMs) * tfMs;
  return { lastClosedAt, nextCloseAt: lastClosedAt + tfMs };
}

/* ─── React Hook: triggers re-render after candle close + settle ─────── */

/**
 * Returns a monotonically increasing key that changes every time
 * a candle of `timeframe` closes AND the settle window has elapsed.
 *
 * The key only emits after CANDLE_SETTLE_MS past the close boundary,
 * ensuring the exchange has finalized the candle data before any
 * consumer (analysis engine, chart, etc.) reads it.
 */
export function useClosedCandleKey(timeframe: string): number {
  const [key, setKey] = useState(() => getCandleCloseInfo(timeframe).lastClosedAt);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      setKey(getCandleCloseInfo(timeframe).lastClosedAt);
    };

    const scheduleTick = () => {
      const now = Date.now();
      const { lastClosedAt, nextCloseAt } = getCandleCloseInfo(timeframe);
      const timeSinceClose = now - lastClosedAt;

      // If we're already past close + settle, emit immediately
      if (timeSinceClose >= CANDLE_SETTLE_MS) {
        tick();
        // Schedule next tick for next close + settle
        const delay = nextCloseAt + CANDLE_SETTLE_MS - now;
        timer = setTimeout(scheduleTick, Math.max(delay, 1000));
        return;
      }

      // Otherwise wait until close + settle
      const delay = nextCloseAt + CANDLE_SETTLE_MS - now;
      timer = setTimeout(tick, Math.max(delay, 1000));
    };

    scheduleTick();

    return () => {
      if (timer) clearTimeout(timer);
    };
    // key in deps so we re-arm after each close
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, key]);

  return key;
}

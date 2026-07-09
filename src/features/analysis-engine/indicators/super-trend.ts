// ---------------------------------------------------------------------------
// SuperTrend
// Trend-following indicator based on ATR — plots above/below price
// ---------------------------------------------------------------------------

import type { SuperTrendResult } from "../types";
import { calcTrueRange, isValidNumber } from "./_helpers";

interface SuperTrendBand {
  readonly upper: number;
  readonly lower: number;
}

export function superTrend(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number = 10,
  multiplier: number = 3,
): SuperTrendResult {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period + 1) {
    return { value: closes[len - 1] ?? 0, direction: "up", signal: "neutral" };
  }

  // Calculate ATR manually (Wilder's smoothing)
  const tr: number[] = [];
  for (let i = 1; i < len; i++) {
    tr.push(calcTrueRange(highs[i], lows[i], closes[i - 1]));
  }

  let atr = 0;
  for (let i = 0; i < Math.min(period, tr.length); i++) {
    atr += tr[i];
  }
  atr /= period;

  // SuperTrend calculation
  let superTrend = closes[period];
  let direction: "up" | "down" = "up";
  let prevUpper = 0;
  let prevLower = 0;

  // Skip first `period` bars to build ATR
  let atrIdx = period - 1;

  for (let i = period; i < len; i++) {
    // Update ATR (Wilder's smoothing)
    if (atrIdx < tr.length) {
      atr = (atr * (period - 1) + tr[atrIdx]) / period;
      atrIdx++;
    }

    const hl2 = (highs[i] + lows[i]) / 2;
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;

    // Previous SuperTrend value
    const prevSuper = superTrend;

    // Calculate basic bands
    let finalUpper = upperBand;
    let finalLower = lowerBand;

    // Ensure bands are sequential
    if (prevUpper !== 0 && upperBand < prevUpper) {
      finalUpper = upperBand;
    } else if (prevUpper !== 0) {
      finalUpper = prevUpper;
    }

    if (prevLower !== 0 && lowerBand > prevLower) {
      finalLower = lowerBand;
    } else if (prevLower !== 0) {
      finalLower = prevLower;
    }

    // Determine direction
    if (prevSuper === -1 || !isValidNumber(prevSuper)) {
      // Was in downtrend
      if (closes[i] > finalLower) {
        direction = "up";
        superTrend = finalLower;
      } else {
        direction = "down";
        superTrend = finalUpper;
      }
    } else {
      // Was in uptrend
      if (closes[i] < finalUpper) {
        direction = "down";
        superTrend = finalUpper;
      } else {
        direction = "up";
        superTrend = finalLower;
      }
    }

    prevUpper = finalUpper;
    prevLower = finalLower;
  }

  const currentPrice = closes[len - 1];
  let signal: "buy" | "sell" | "neutral";

  if (direction === "up" && currentPrice > superTrend) {
    signal = "buy";
  } else if (direction === "down" && currentPrice < superTrend) {
    signal = "sell";
  } else {
    signal = "neutral";
  }

  return {
    value: Math.round(superTrend * 100) / 100,
    direction,
    signal,
  };
}

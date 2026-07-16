// ---------------------------------------------------------------------------
// Ichimoku Cloud (Ichimoku Kinkō Hyō)
// Comprehensive indicator — support/resistance, trend direction, momentum
// ---------------------------------------------------------------------------

import type { IchimokuResult } from "../types";
import { highest, lowest } from "./_helpers";

export function ichimoku(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
): IchimokuResult {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < 52) {
    return {
      conversionLine: 0, baseLine: 0,
      leadingSpanA: 0, leadingSpanB: 0, laggingSpan: 0,
      cloud: "inside",
    };
  }

  // Tenkan-sen (Conversion Line): 9-period midpoint
  const convHigh = highest(highs, 9);
  const convLow = lowest(lows, 9);
  const conversionLine = (convHigh + convLow) / 2;

  // Kijun-sen (Base Line): 26-period midpoint
  const baseHigh = highest(highs, 26);
  const baseLow = lowest(lows, 26);
  const baseLine = (baseHigh + baseLow) / 2;

  // Senkou Span A (Leading Span A): (Conversion + Base) / 2, shifted forward
  const senkouA = (conversionLine + baseLine) / 2;

  // Senkou Span B (Leading Span B): 52-period midpoint, shifted forward
  const spanBHigh = highest(highs, 52);
  const spanBLow = lowest(lows, 52);
  const senkouB = (spanBHigh + spanBLow) / 2;

  // Chikou Span (Lagging Span): current close shifted 26 periods back
  const laggingSpan = closes[len - 26] ?? closes[0];

  // Cloud position: compare current price to Senkou A/B
  const currentPrice = closes[len - 1];
  const minCloud = Math.min(senkouA, senkouB);
  const maxCloud = Math.max(senkouA, senkouB);

  let cloud: "above" | "below" | "inside";
  if (currentPrice > maxCloud) {
    cloud = "above";
  } else if (currentPrice < minCloud) {
    cloud = "below";
  } else {
    cloud = "inside";
  }

  return {
    conversionLine: Math.round(conversionLine * 100) / 100,
    baseLine: Math.round(baseLine * 100) / 100,
    leadingSpanA: Math.round(senkouA * 100) / 100,
    leadingSpanB: Math.round(senkouB * 100) / 100,
    laggingSpan: Math.round(laggingSpan * 100) / 100,
    cloud,
  };
}

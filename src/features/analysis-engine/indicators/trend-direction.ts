// ---------------------------------------------------------------------------
// Trend Direction
// Determines market trend from EMA alignment and price relative to EMAs
// ---------------------------------------------------------------------------

import type { TrendDirection } from "../types";

export function trendDirection(
  closes: readonly number[],
  emaShort: readonly number[],
  emaLong: readonly number[],
): TrendDirection {
  if (closes.length === 0 || emaShort.length === 0 || emaLong.length === 0) {
    return "neutral";
  }

  const lastShort = emaShort[emaShort.length - 1];
  const prevShort = emaShort.length > 1 ? emaShort[emaShort.length - 2] : lastShort;

  const lastLong = emaLong[emaLong.length - 1];
  const prevLong = emaLong.length > 1 ? emaLong[emaLong.length - 2] : lastLong;

  const currentPrice = closes[closes.length - 1];

  if (!Number.isFinite(lastShort) || !Number.isFinite(lastLong)) {
    return "neutral";
  }

  // Bullish: short EMA above long EMA, both rising, price above both
  const shortAboveLong = lastShort > lastLong;
  const shortRising = lastShort > prevShort;
  const longRising = lastLong > prevLong;
  const priceAboveShort = currentPrice > lastShort;
  const priceAboveLong = currentPrice > lastLong;

  // Bearish: short EMA below long EMA, both falling, price below both
  const shortBelowLong = lastShort < lastLong;
  const shortFalling = lastShort < prevShort;
  const longFalling = lastLong < prevLong;
  const priceBelowShort = currentPrice < lastShort;
  const priceBelowLong = currentPrice < lastLong;

  const bullishSignals = [
    shortAboveLong, shortRising, longRising,
    priceAboveShort, priceAboveLong,
  ].filter(Boolean).length;

  const bearishSignals = [
    shortBelowLong, shortFalling, longFalling,
    priceBelowShort, priceBelowLong,
  ].filter(Boolean).length;

  if (bullishSignals >= 4) return "bullish";
  if (bearishSignals >= 4) return "bearish";
  return "neutral";
}

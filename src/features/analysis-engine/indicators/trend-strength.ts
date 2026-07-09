// ---------------------------------------------------------------------------
// Trend Strength
// Classifies ADX value into categorical strength levels
// ---------------------------------------------------------------------------

import type { TrendStrengthResult, SignalStrength } from "../types";

export function trendStrength(adxValue: number): TrendStrengthResult {
  const clamped = Math.max(0, Math.min(100, adxValue));

  let label: SignalStrength;
  if (clamped >= 50) label = "strong";
  else if (clamped >= 25) label = "moderate";
  else label = "weak";

  return {
    value: Math.round(clamped * 100) / 100,
    label,
  };
}

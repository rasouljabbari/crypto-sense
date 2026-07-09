import { clamp } from "../utils";
import { TREND_STRONG_ADX, TREND_MODERATE_ADX } from "../constants";
import type { TrendStrengthResult } from "../types";

export function trendStrength(adxValue: number): TrendStrengthResult {
  const value = Math.round(clamp(adxValue, 0, 100) * 100) / 100;

  let label: TrendStrengthResult["label"];
  if (value >= TREND_STRONG_ADX) label = "strong";
  else if (value >= TREND_MODERATE_ADX) label = "moderate";
  else label = "weak";

  return { value, label };
}

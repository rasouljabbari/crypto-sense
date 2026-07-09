import { isValid, round } from "../utils";
import {
  VOLATILITY_ANNUALIZATION,
  VOLATILITY_LOW,
  VOLATILITY_MEDIUM,
  VOLATILITY_HIGH,
} from "../constants";
import type { VolatilityResult } from "../types";

export function volatility(
  closes: readonly number[],
  annualization: number = VOLATILITY_ANNUALIZATION,
): VolatilityResult {
  if (closes.length < 2) {
    return { value: 0, annualized: 0, label: "low" };
  }

  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (isValid(closes[i]) && isValid(closes[i - 1]) && closes[i - 1] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }

  if (logReturns.length < 2) {
    return { value: 0, annualized: 0, label: "low" };
  }

  const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
  const sumSqDiff = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0);
  const dailyStdDev = Math.sqrt(sumSqDiff / (logReturns.length - 1));

  const dailyVolPct = dailyStdDev * 100;
  const annualizedVol = dailyStdDev * Math.sqrt(annualization) * 100;

  let label: VolatilityResult["label"];
  if (annualizedVol < VOLATILITY_LOW) label = "low";
  else if (annualizedVol < VOLATILITY_MEDIUM) label = "medium";
  else if (annualizedVol < VOLATILITY_HIGH) label = "high";
  else label = "extreme";

  return {
    value: round(dailyVolPct, 4),
    annualized: round(annualizedVol, 2),
    label,
  };
}

import { calcTrueRange, calcWilderSmooth, lastValid, isValid } from "../utils";
import { ATR_PERIOD } from "../constants";
import type { AtrResult } from "../types";

export function atr(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number = ATR_PERIOD,
): AtrResult {
  if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
    return { value: 0 };
  }

  const trValues: number[] = new Array(highs.length).fill(NaN);
  for (let i = 1; i < highs.length; i++) {
    trValues[i] = calcTrueRange(highs[i], lows[i], closes[i - 1]);
  }

  const smoothed = calcWilderSmooth(trValues, period);
  const value = lastValid(smoothed);

  if (!isValid(value)) {
    return { value: 0 };
  }

  return { value: Math.round(value * 100) / 100 };
}

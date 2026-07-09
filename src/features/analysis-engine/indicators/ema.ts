// ---------------------------------------------------------------------------
// Exponential Moving Average (EMA)
// Weighted moving average giving more weight to recent prices
// ---------------------------------------------------------------------------

import type { MovingAverageResult } from "../types";
import { calcEma, lastValid } from "./_helpers";

export function ema(
  closes: readonly number[],
  period: number,
): MovingAverageResult {
  if (closes.length < period) {
    return { period, value: 0 };
  }

  const values = calcEma(closes, period);
  const value = lastValid(values);

  return { period, value };
}

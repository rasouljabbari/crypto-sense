// ---------------------------------------------------------------------------
// Average True Range (ATR)
// Market volatility measure — smoothed average of true range over period
// ---------------------------------------------------------------------------

import type { AtrResult } from "../types";
import { calcTrueRange, wilderSmooth, lastValid, isValidNumber } from "./_helpers";

export function atr(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  period: number = 14,
): AtrResult {
  const len = highs.length;
  if (len < period + 1) {
    return { value: 0 };
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < len; i++) {
    const tr = calcTrueRange(highs[i], lows[i], closes[i - 1]);
    trueRanges.push(tr);
  }

  const smoothed = wilderSmooth(trueRanges, period);
  const value = lastValid(smoothed);

  if (!isValidNumber(value)) {
    return { value: 0 };
  }

  return { value: Math.round(value * 100) / 100 };
}

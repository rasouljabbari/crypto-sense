import { calcTypicalPrice, isValid } from "../utils";
import type { VwapResult } from "../types";

export function vwap(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  volumes: readonly number[],
): VwapResult {
  const len = Math.min(highs.length, lows.length, closes.length, volumes.length);
  if (len < 1) return { value: 0 };

  let sumPV = 0;
  let sumV = 0;

  for (let i = 0; i < len; i++) {
    if (!isValid(volumes[i]) || volumes[i] <= 0) continue;
    const tp = calcTypicalPrice(highs[i], lows[i], closes[i]);
    if (!isValid(tp)) continue;
    sumPV += tp * volumes[i];
    sumV += volumes[i];
  }

  if (sumV === 0) return { value: 0 };

  return { value: Math.round((sumPV / sumV) * 100) / 100 };
}

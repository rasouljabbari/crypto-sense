// ---------------------------------------------------------------------------
// Volume Weighted Average Price (VWAP)
// Average price weighted by volume — institutional benchmark
// ---------------------------------------------------------------------------

import type { VwapResult } from "../types";
import { calcTypicalPrice, isValidNumber } from "./_helpers";

export function vwap(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  volumes: readonly number[],
): VwapResult {
  const len = Math.min(highs.length, lows.length, closes.length, volumes.length);
  if (len < 1) {
    return { value: 0 };
  }

  let tpvSum = 0;
  let volSum = 0;

  for (let i = 0; i < len; i++) {
    const tp = calcTypicalPrice(highs[i], lows[i], closes[i]);
    const vol = volumes[i];

    if (!isValidNumber(tp) || !isValidNumber(vol) || vol <= 0) continue;

    tpvSum += tp * vol;
    volSum += vol;
  }

  if (volSum === 0) {
    return { value: 0 };
  }

  return { value: Math.round((tpvSum / volSum) * 100) / 100 };
}

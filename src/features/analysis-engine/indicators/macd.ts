// ---------------------------------------------------------------------------
// Moving Average Convergence Divergence (MACD)
// Trend-following momentum indicator — EMA12 - EMA26, signal line, histogram
// ---------------------------------------------------------------------------

import type { MacdResult } from "../types";
import { calcEma, lastValid } from "./_helpers";

export function macd(closes: readonly number[]): MacdResult {
  if (closes.length < 26) {
    return { value: 0, signal: 0, histogram: 0, bullish: false };
  }

  const ema12 = calcEma(closes, 12);
  const ema26 = calcEma(closes, 26);

  // MACD line: EMA12 - EMA26
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (!Number.isFinite(ema12[i]) || !Number.isFinite(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }

  // Signal line: EMA9 of MACD line
  const validMacd = macdLine.filter(Number.isFinite);
  const signalEma = calcEma(validMacd, 9);

  // Build aligned signal array + histogram
  let signalIdx = signalEma.length - 1;
  const histogram: number[] = [];
  for (let i = macdLine.length - 1; i >= 0; i--) {
    if (!Number.isFinite(macdLine[i])) {
      histogram.unshift(NaN);
    } else {
      histogram.unshift(macdLine[i] - signalEma[signalIdx]);
      signalIdx--;
    }
  }

  const value = lastValid(macdLine);
  const signal = lastValid(signalEma);
  const hist = lastValid(histogram);

  return {
    value,
    signal,
    histogram: hist,
    bullish: hist > 0,
  };
}

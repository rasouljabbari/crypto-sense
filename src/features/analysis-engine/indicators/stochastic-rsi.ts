// ---------------------------------------------------------------------------
// Stochastic RSI
// RSI indicator applied to RSI values — identifies overbought/oversold
// within the RSI range itself
// ---------------------------------------------------------------------------

import type { StochasticRsiResult } from "../types";
import { rsi } from "./rsi";
import { calcSma, lastValid, isValidNumber, highest, lowest } from "./_helpers";

export function stochasticRsi(
  closes: readonly number[],
  period: number = 14,
  kPeriod: number = 3,
  dPeriod: number = 3,
): StochasticRsiResult {
  if (closes.length < period * 2) {
    return {
      k: 50, d: 50, kValues: [], dValues: [],
      oversold: false, overbought: false,
    };
  }

  // Calculate RSI values for each sub-window
  const rsiValues: number[] = [];
  for (let i = period; i <= closes.length; i++) {
    const window = closes.slice(i - period, i);
    const result = rsi(window, period);
    rsiValues.push(result.value);
  }

  if (rsiValues.length < period) {
    return {
      k: 50, d: 50, kValues: [], dValues: [],
      oversold: false, overbought: false,
    };
  }

  // StochRSI = (RSI - minRSI) / (maxRSI - minRSI) → scaled to 0-100
  const stochRsiValues: number[] = [];
  for (let i = 0; i < rsiValues.length; i++) {
    const start = Math.max(0, i - period + 1);
    const window = rsiValues.slice(start, i + 1);
    const hi = Math.max(...window);
    const lo = Math.min(...window);

    if (hi === lo) {
      stochRsiValues.push(50);
    } else {
      stochRsiValues.push(((rsiValues[i] - lo) / (hi - lo)) * 100);
    }
  }

  // %K = SMA of StochRSI
  const kValues = calcSma(stochRsiValues, kPeriod);

  // %D = SMA of %K
  const validK = kValues.filter(isValidNumber);
  const dValues = calcSma(validK, dPeriod);

  const k = lastValid(kValues);
  const d = lastValid(dValues);

  return {
    k: Math.round(k * 100) / 100,
    d: Math.round(d * 100) / 100,
    kValues,
    dValues,
    oversold: k <= 20 && d <= 20,
    overbought: k >= 80 && d >= 80,
  };
}

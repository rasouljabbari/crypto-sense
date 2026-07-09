import { calcEma, lastValid, isValid } from "../utils";
import { MACD_FAST, MACD_SLOW, MACD_SIGNAL } from "../constants";
import type { MacdResult } from "../types";

export function macd(
  closes: readonly number[],
  fastPeriod: number = MACD_FAST,
  slowPeriod: number = MACD_SLOW,
  signalPeriod: number = MACD_SIGNAL,
): MacdResult {
  if (closes.length < slowPeriod + signalPeriod) {
    return { value: 0, signal: 0, histogram: 0, bullish: false };
  }

  const fastEma = calcEma(closes, fastPeriod);
  const slowEma = calcEma(closes, slowPeriod);

  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (isValid(fastEma[i]) && isValid(slowEma[i])) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }

  const signalLine = calcEma(macdLine, signalPeriod);
  const histogram: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (isValid(macdLine[i]) && isValid(signalLine[i])) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  const value = lastValid(macdLine);
  const signal = lastValid(signalLine);
  const hist = lastValid(histogram);

  if (!isValid(value) || !isValid(signal) || !isValid(hist)) {
    return { value: 0, signal: 0, histogram: 0, bullish: false };
  }

  return {
    value: Math.round(value * 100) / 100,
    signal: Math.round(signal * 100) / 100,
    histogram: Math.round(hist * 100) / 100,
    bullish: hist > 0,
  };
}

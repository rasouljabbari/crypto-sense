import { calcWilderSmooth, diff, abs, isValid, lastValid } from "../utils";
import { RSI_PERIOD, RSI_OVERSOLD, RSI_OVERBOUGHT } from "../constants";
import type { RsiResult } from "../types";

export function rsi(closes: readonly number[], period: number = RSI_PERIOD): RsiResult {
  if (closes.length < period + 1) {
    return { value: 50, oversold: false, overbought: false };
  }

  const priceDiffs = diff(closes);
  const gains = priceDiffs.map((d) => (isValid(d) && d > 0 ? d : 0));
  const losses = priceDiffs.map((d) => (isValid(d) && d < 0 ? -d : 0));

  const avgGain = calcWilderSmooth(gains, period);
  const avgLoss = calcWilderSmooth(losses, period);

  const lastGain = lastValid(avgGain);
  const lastLoss = lastValid(avgLoss);

  if (!isValid(lastGain) || !isValid(lastLoss)) {
    return { value: 50, oversold: false, overbought: false };
  }

  if (lastLoss === 0) {
    return { value: 100, oversold: false, overbought: true };
  }

  const rs = lastGain / lastLoss;
  const value = Math.round((100 - 100 / (1 + rs)) * 100) / 100;

  return {
    value,
    oversold: value <= RSI_OVERSOLD,
    overbought: value >= RSI_OVERBOUGHT,
  };
}

// ---------------------------------------------------------------------------
// Relative Strength Index (RSI)
// Wilder's smoothed RSI — compares magnitude of recent gains to losses
// ---------------------------------------------------------------------------

import type { RsiResult } from "../types";
import { wilderSmooth, lastValid, isValidNumber } from "./_helpers";

export function rsi(
  closes: readonly number[],
  period: number = 14,
): RsiResult {
  if (closes.length < period + 1) {
    return { value: 50, oversold: false, overbought: false };
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  const avgGain = wilderSmooth(gains, period);
  const avgLoss = wilderSmooth(losses, period);

  const lastGain = lastValid(avgGain);
  const lastLoss = lastValid(avgLoss);

  if (!isValidNumber(lastGain) || !isValidNumber(lastLoss)) {
    return { value: 50, oversold: false, overbought: false };
  }

  if (lastLoss === 0) {
    return { value: 100, oversold: false, overbought: true };
  }

  const rs = lastGain / lastLoss;
  const value = Math.round((100 - 100 / (1 + rs)) * 100) / 100;

  return {
    value,
    oversold: value <= 30,
    overbought: value >= 70,
  };
}

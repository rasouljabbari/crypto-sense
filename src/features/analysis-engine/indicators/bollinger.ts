// ---------------------------------------------------------------------------
// Bollinger Bands
// Volatility bands — SMA ± K * standard deviation
// ---------------------------------------------------------------------------

import type { BollingerBandResult } from "../types";
import { calcSma, calcStdDev, lastValid, isValidNumber } from "./_helpers";

export function bollingerBands(
  closes: readonly number[],
  period: number = 20,
  stdDev: number = 2,
): BollingerBandResult {
  if (closes.length < period) {
    return {
      upper: 0, middle: 0, lower: 0, width: 0,
      pricePosition: "inside",
    };
  }

  const sma = calcSma(closes, period);

  const upperArr: number[] = [];
  const lowerArr: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (!isValidNumber(sma[i])) {
      upperArr.push(NaN);
      lowerArr.push(NaN);
      continue;
    }
    const std = calcStdDev(closes, period, sma[i]);
    upperArr.push(sma[i] + stdDev * std);
    lowerArr.push(sma[i] - stdDev * std);
  }

  const middle = lastValid(sma);
  const upper = lastValid(upperArr);
  const lower = lastValid(lowerArr);
  const width = middle > 0 ? (upper - lower) / middle : 0;

  const currentPrice = closes[closes.length - 1];
  let pricePosition: "above" | "below" | "inside";
  if (currentPrice > upper) pricePosition = "above";
  else if (currentPrice < lower) pricePosition = "below";
  else pricePosition = "inside";

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    width: Math.round(width * 10000) / 10000,
    pricePosition,
  };
}

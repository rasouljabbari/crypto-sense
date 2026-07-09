import { calcSma, calcStdDev, lastValid, isValid } from "../utils";
import { BOLLINGER_PERIOD, BOLLINGER_STD_DEV } from "../constants";
import type { BollingerBandResult } from "../types";

export function bollingerBands(
  closes: readonly number[],
  period: number = BOLLINGER_PERIOD,
  stdDevMultiplier: number = BOLLINGER_STD_DEV,
): BollingerBandResult {
  if (closes.length < period) {
    return {
      upper: 0,
      middle: 0,
      lower: 0,
      width: 0,
      pricePosition: "inside",
    };
  }

  const smaValues = calcSma(closes, period);
  const middle = lastValid(smaValues);

  if (!isValid(middle)) {
    return { upper: 0, middle: 0, lower: 0, width: 0, pricePosition: "inside" };
  }

  const stdDev = calcStdDev(closes, period, middle);
  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const lastClose = closes[closes.length - 1];

  let pricePosition: BollingerBandResult["pricePosition"] = "inside";
  if (isValid(lastClose) && isValid(upper) && isValid(lower)) {
    if (lastClose > upper) pricePosition = "above";
    else if (lastClose < lower) pricePosition = "below";
  }

  const width = middle !== 0 ? (upper - lower) / middle : 0;

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    width: Math.round(width * 10000) / 10000,
    pricePosition,
  };
}

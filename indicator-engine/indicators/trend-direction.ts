import { isValid } from "../utils";
import type { TrendDirectionResult } from "../types";

export function trendDirection(
  closes: readonly number[],
  emaShort: readonly number[],
  emaLong: readonly number[],
): TrendDirectionResult {
  if (closes.length < 2 || emaShort.length < 2 || emaLong.length < 2) {
    return { direction: "neutral", bullishSignals: 0, bearishSignals: 0 };
  }

  const lastShort = emaShort[emaShort.length - 1];
  const prevShort = emaShort[emaShort.length - 2];
  const lastLong = emaLong[emaLong.length - 1];
  const prevLong = emaLong[emaLong.length - 2];
  const lastClose = closes[closes.length - 1];

  let bullishSignals = 0;
  let bearishSignals = 0;

  if (isValid(lastShort) && isValid(lastLong)) {
    if (lastShort > lastLong) bullishSignals++;
    else bearishSignals++;
  }

  if (isValid(lastShort) && isValid(prevShort)) {
    if (lastShort > prevShort) bullishSignals++;
    else bearishSignals++;
  }

  if (isValid(lastLong) && isValid(prevLong)) {
    if (lastLong > prevLong) bullishSignals++;
    else bearishSignals++;
  }

  if (isValid(lastClose) && isValid(lastShort)) {
    if (lastClose > lastShort) bullishSignals++;
    else bearishSignals++;
  }

  if (isValid(lastClose) && isValid(lastLong)) {
    if (lastClose > lastLong) bullishSignals++;
    else bearishSignals++;
  }

  let direction: TrendDirectionResult["direction"] = "neutral";
  if (bullishSignals >= 4) direction = "bullish";
  else if (bearishSignals >= 4) direction = "bearish";

  return { direction, bullishSignals, bearishSignals };
}

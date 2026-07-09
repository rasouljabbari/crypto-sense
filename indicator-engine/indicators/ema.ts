import { calcEma, lastValid, isValid } from "../utils";
import type { MovingAverageResult } from "../types";

export function ema(
  values: readonly number[],
  period: number,
): MovingAverageResult {
  if (values.length < period || period <= 0) {
    return { period, value: 0 };
  }

  const result = calcEma(values, period);
  const lastValue = lastValid(result);

  if (!isValid(lastValue)) {
    return { period, value: 0 };
  }

  return { period, value: lastValue };
}

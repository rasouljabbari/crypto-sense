import { calcSma, lastValid, isValid } from "../utils";
import type { SmaResult } from "../types";

export function sma(
  values: readonly number[],
  period: number = 20,
): SmaResult {
  if (values.length < period || period <= 0) {
    return { period, value: 0, values: [] };
  }

  const result = calcSma(values, period);
  const lastValue = lastValid(result);

  if (!isValid(lastValue)) {
    return { period, value: 0, values: result };
  }

  return { period, value: lastValue, values: result };
}

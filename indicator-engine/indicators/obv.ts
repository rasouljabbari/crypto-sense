import { isValid, round } from "../utils";
import type { ObvResult } from "../types";

export function obv(
  closes: readonly number[],
  volumes: readonly number[],
): ObvResult {
  if (closes.length < 2 || volumes.length < 2) {
    return { value: 0, trend: "flat" };
  }

  let obvValue = 0;
  const obvValues: number[] = [0];

  for (let i = 1; i < Math.min(closes.length, volumes.length); i++) {
    if (!isValid(closes[i]) || !isValid(closes[i - 1]) || !isValid(volumes[i])) {
      obvValues.push(obvValue);
      continue;
    }

    if (closes[i] > closes[i - 1]) {
      obvValue += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obvValue -= volumes[i];
    }
    obvValues.push(obvValue);
  }

  const len = obvValues.length;
  const third = Math.floor(len / 3);
  const firstThird = obvValues.slice(0, third);
  const lastThird = obvValues.slice(len - third);

  const avgFirst = firstThird.reduce((s, v) => s + v, 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, v) => s + v, 0) / lastThird.length;

  const change = avgLast - avgFirst;
  const threshold = Math.abs(avgFirst) * 0.01 || 1;

  let trend: ObvResult["trend"] = "flat";
  if (change > threshold) trend = "rising";
  else if (change < -threshold) trend = "falling";

  return { value: round(obvValue), trend };
}

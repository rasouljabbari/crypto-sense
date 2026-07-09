// ---------------------------------------------------------------------------
// On-Balance Volume (OBV)
// Cumulative volume indicator — adds volume on up days, subtracts on down
// ---------------------------------------------------------------------------

import type { ObvResult } from "../types";

export function obv(
  closes: readonly number[],
  volumes: readonly number[],
): ObvResult {
  if (closes.length < 2 || closes.length !== volumes.length) {
    return { value: 0, values: [], trend: "flat" };
  }

  const values: number[] = [];
  let current = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      current = volumes[i];
    } else {
      if (closes[i] > closes[i - 1]) {
        current += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        current -= volumes[i];
      }
      // else: close unchanged → OBV unchanged
    }
    values.push(current);
  }

  const value = values[values.length - 1];

  // Determine trend by comparing recent OBV thirds
  const third = Math.max(Math.floor(values.length / 3), 1);
  const firstThird = values[third - 1] ?? values[0];
  const lastThird = values[values.length - 1];
  const midThird = values[values.length - 1 - third] ?? values[0];

  let trend: "rising" | "falling" | "flat";
  if (lastThird > firstThird && lastThird > midThird) {
    trend = "rising";
  } else if (lastThird < firstThird && lastThird < midThird) {
    trend = "falling";
  } else {
    trend = "flat";
  }

  return { value, values, trend };
}

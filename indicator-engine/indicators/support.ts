import { isValid, lowest as lowestUtil } from "../utils";
import { PIVOT_LOOKBACK, CLUSTER_THRESHOLD, MAX_LEVELS } from "../constants";
import type { SupportResult } from "../types";

function clusterLevels(levels: number[], threshold: number): number[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clustered: number[] = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const avg =
      currentCluster.reduce((s, v) => s + v, 0) / currentCluster.length;
    if (Math.abs(sorted[i] - avg) / avg <= threshold) {
      currentCluster.push(sorted[i]);
    } else {
      clustered.push(
        currentCluster.reduce((s, v) => s + v, 0) / currentCluster.length,
      );
      currentCluster = [sorted[i]];
    }
  }
  clustered.push(
    currentCluster.reduce((s, v) => s + v, 0) / currentCluster.length,
  );

  return clustered;
}

export function support(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
): SupportResult {
  if (highs.length < 3 || lows.length < 3 || closes.length < 3) {
    return { levels: [] };
  }

  const lastClose = closes[closes.length - 1];

  const pivotLows: number[] = [];
  for (let i = PIVOT_LOOKBACK; i < lows.length - PIVOT_LOOKBACK; i++) {
    if (!isValid(lows[i])) continue;
    let isPivot = true;
    for (let j = i - PIVOT_LOOKBACK; j <= i + PIVOT_LOOKBACK; j++) {
      if (j !== i && isValid(lows[j]) && lows[j] < lows[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivotLows.push(lows[i]);
  }

  const recentLow = lowestUtil(lows, 20);

  const allLevels = [...pivotLows, recentLow, lastClose * 0.9]
    .filter((l) => isValid(l) && l < lastClose);

  if (allLevels.length === 0) return { levels: [] };

  const clustered = clusterLevels(allLevels, CLUSTER_THRESHOLD);

  const belowPrice = clustered
    .filter((l) => l < lastClose)
    .sort((a, b) => b - a);

  const levels = belowPrice.slice(0, MAX_LEVELS).map((l) => Math.round(l * 100) / 100);

  return { levels };
}

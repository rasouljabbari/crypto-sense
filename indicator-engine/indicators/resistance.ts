import { isValid, highest } from "../utils";
import { PIVOT_LOOKBACK, CLUSTER_THRESHOLD, MAX_LEVELS } from "../constants";
import type { ResistanceResult } from "../types";

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

export function resistance(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
): ResistanceResult {
  if (highs.length < 3 || lows.length < 3 || closes.length < 3) {
    return { levels: [] };
  }

  const lastClose = closes[closes.length - 1];

  const pivotHighs: number[] = [];
  for (let i = PIVOT_LOOKBACK; i < highs.length - PIVOT_LOOKBACK; i++) {
    if (!isValid(highs[i])) continue;
    let isPivot = true;
    for (let j = i - PIVOT_LOOKBACK; j <= i + PIVOT_LOOKBACK; j++) {
      if (j !== i && isValid(highs[j]) && highs[j] > highs[i]) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) pivotHighs.push(highs[i]);
  }

  const recentHigh = highest(highs, 20);

  const allLevels = [...pivotHighs, recentHigh, lastClose * 1.1]
    .filter((l) => isValid(l) && l > lastClose);

  if (allLevels.length === 0) return { levels: [] };

  const clustered = clusterLevels(allLevels, CLUSTER_THRESHOLD);

  const abovePrice = clustered
    .filter((l) => l > lastClose)
    .sort((a, b) => a - b);

  const levels = abovePrice.slice(0, MAX_LEVELS).map((l) => Math.round(l * 100) / 100);

  return { levels };
}

// ---------------------------------------------------------------------------
// Support & Resistance Levels — improved accuracy
// Uses multi-window pivot detection, adaptive clustering, and smart rounding.
// ---------------------------------------------------------------------------

import type { SupportResistanceLevel, SupportResistanceResult } from "../types";
import { highest, lowest } from "./_helpers";

interface Pivot {
  price: number;
  strength: number;
}

/**
 * Detect pivot highs/lows across multiple lookback windows.
 * Wider windows catch major levels; narrower windows catch recent structure.
 */
function detectPivots(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
): Pivot[] {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < 10) return [];

  const currentPrice = closes[len - 1];
  const pivots: Pivot[] = [];

  // Multiple lookback windows: 2, 3, 5 bars each side
  const windows = [2, 3, 5];

  for (const w of windows) {
    for (let i = w; i < len - w; i++) {
      // Pivot high
      let isHigh = true;
      for (let j = 1; j <= w; j++) {
        if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) {
          isHigh = false;
          break;
        }
      }
      if (isHigh) {
        const dist = Math.abs(highs[i] - currentPrice) / currentPrice;
        // Closer pivots get more weight; wider windows get more weight
        const distWeight = dist < 0.03 ? 3 : dist < 0.08 ? 2 : 1;
        const strength = distWeight + w;
        pivots.push({ price: highs[i], strength });
      }

      // Pivot low
      let isLow = true;
      for (let j = 1; j <= w; j++) {
        if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) {
          isLow = false;
          break;
        }
      }
      if (isLow) {
        const dist = Math.abs(lows[i] - currentPrice) / currentPrice;
        const distWeight = dist < 0.03 ? 3 : dist < 0.08 ? 2 : 1;
        const strength = distWeight + w;
        pivots.push({ price: lows[i], strength });
      }
    }
  }

  return pivots;
}

/**
 * Add round-number psychological levels.
 * Adapts magnitude to the price scale (e.g. 0.01, 0.1, 1, 10, 100, 1000…).
 * Also adds mid-points (0.5 × magnitude).
 */
function addRoundNumbers(currentPrice: number): Pivot[] {
  const pivots: Pivot[] = [];

  // Determine magnitude: 10^floor(log10(price))
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(currentPrice, 1e-8))));

  // Sub-magnitudes: full, half, quarter
  const steps = [magnitude, magnitude / 2, magnitude / 4, magnitude * 2];

  for (const step of steps) {
    if (step < 1e-8) continue;
    const start = Math.floor(currentPrice / step) * step - step * 2;
    const end = Math.ceil(currentPrice / step) * step + step * 2;
    for (let p = start; p <= end; p += step) {
      if (p > 0) {
        const dist = Math.abs(p - currentPrice) / currentPrice;
        // Round numbers near price get higher strength
        const distWeight = dist < 0.02 ? 3 : dist < 0.05 ? 2 : 1;
        pivots.push({ price: Math.round(p * 1e8) / 1e8, strength: distWeight });
      }
    }
  }

  return pivots;
}

/**
 * Adaptive clustering threshold based on price magnitude.
 * Higher prices → larger threshold.
 */
function clusterThreshold(currentPrice: number): number {
  if (currentPrice < 0.01) return currentPrice * 0.02;
  if (currentPrice < 0.1) return currentPrice * 0.01;
  if (currentPrice < 1) return currentPrice * 0.008;
  if (currentPrice < 10) return currentPrice * 0.005;
  if (currentPrice < 100) return currentPrice * 0.004;
  return currentPrice * 0.003;
}

/**
 * Cluster nearby pivots and aggregate their strength.
 */
function clusterPivots(pivots: Pivot[], threshold: number): Pivot[] {
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const clusters: Pivot[] = [];

  for (const p of sorted) {
    const existing = clusters.find((c) => Math.abs(c.price - p.price) < threshold);
    if (existing) {
      existing.strength += p.strength;
      existing.price = (existing.price + p.price) / 2;
    } else {
      clusters.push({ price: p.price, strength: p.strength });
    }
  }

  return clusters;
}

export function supportResistance(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
): SupportResistanceResult {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < 20) {
    return { nearestSupport: null, nearestResistance: null, supportLevels: [], resistanceLevels: [] };
  }

  const currentPrice = closes[len - 1];

  // 1. Multi-window pivots
  const pivots = detectPivots(highs, lows, closes);

  // 2. Round numbers
  const roundNumbers = addRoundNumbers(currentPrice);

  // 3. Recent high/low as strong anchor levels
  const recentHigh = highest(highs, 20);
  const recentLow = lowest(lows, 20);
  pivots.push({ price: recentHigh, strength: 4 });
  pivots.push({ price: recentLow, strength: 4 });

  // 4. Combine all candidates
  const allCandidates = [...pivots, ...roundNumbers];

  // 5. Adaptive clustering
  const threshold = clusterThreshold(currentPrice);
  const clusters = clusterPivots(allCandidates, threshold);

  // 6. Separate into support (below price) and resistance (above price)
  const resistance = clusters
    .filter((p) => p.price > currentPrice)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8)
    .sort((a, b) => a.price - b.price);

  const support = clusters
    .filter((p) => p.price < currentPrice)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8)
    .sort((a, b) => b.price - a.price);

  // 7. Format with consistent precision
  const decimals = currentPrice < 0.01 ? 6 : currentPrice < 0.1 ? 5 : currentPrice < 1 ? 4 : currentPrice < 10 ? 3 : 2;
  const factor = 10 ** decimals;

  const formatLevel = (p: Pivot, isSupport: boolean): SupportResistanceLevel => {
    const distancePercent = ((p.price - currentPrice) / currentPrice) * 100;
    const roundedPrice = Math.round(p.price * factor) / factor;
    const roundedDistance = Math.round(Math.abs(distancePercent) * 10) / 10;
    const cappedStrength = Math.min(5, Math.round(p.strength / 2) || 1);

    return {
      price: roundedPrice,
      distancePercent: isSupport ? -roundedDistance : roundedDistance,
      strength: cappedStrength,
    };
  };

  const formattedSupport = support.map((p) => formatLevel(p, true));
  const formattedResistance = resistance.map((p) => formatLevel(p, false));

  return {
    nearestSupport: formattedSupport[0] || null,
    nearestResistance: formattedResistance[0] || null,
    supportLevels: formattedSupport,
    resistanceLevels: formattedResistance,
  };
}

// ---------------------------------------------------------------------------
// Support & Resistance Levels
// Key price levels based on pivot points, round numbers, and clustering
// ---------------------------------------------------------------------------

import type { SupportResistanceLevel, SupportResistanceResult } from "../types";
import { highest, lowest } from "./_helpers";

interface Pivot {
  price: number;
  strength: number;
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
  const pivots: Pivot[] = [];

  // 1. Find pivot highs (resistance candidates)
  // A pivot high is a bar where the high is higher than bars before and after
  for (let i = 2; i < len - 2; i++) {
    if (
      highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
      highs[i] > highs[i + 1] && highs[i] > highs[i + 2]
    ) {
      const distance = Math.abs(highs[i] - currentPrice) / currentPrice;
      const strength = distance < 0.05 ? 3 : distance < 0.1 ? 2 : 1;
      pivots.push({ price: highs[i], strength });
    }

    // Pivot low (support candidates)
    if (
      lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
      lows[i] < lows[i + 1] && lows[i] < lows[i + 2]
    ) {
      const distance = Math.abs(lows[i] - currentPrice) / currentPrice;
      const strength = distance < 0.05 ? 3 : distance < 0.1 ? 2 : 1;
      pivots.push({ price: lows[i], strength });
    }
  }

  // 2. Add round number levels
  const magnitude = Math.pow(10, Math.floor(Math.log10(currentPrice)));
  for (let m = magnitude; m < currentPrice * 2; m += magnitude) {
    pivots.push({ price: m, strength: 2 });
  }
  const halfMag = magnitude / 2;
  for (let m = halfMag; m < currentPrice * 2; m += halfMag) {
    pivots.push({ price: m, strength: 1 });
  }

  // 3. Add recent high/low as key levels
  const recentHigh = highest(highs, 20);
  const recentLow = lowest(lows, 20);
  pivots.push({ price: recentHigh, strength: 3 });
  pivots.push({ price: recentLow, strength: 3 });

  // 4. Cluster nearby pivots (within 0.5% of each other)
  const clusterThreshold = currentPrice * 0.005;
  pivots.sort((a, b) => a.price - b.price);

  const clusters: Pivot[] = [];
  for (const pivot of pivots) {
    const existing = clusters.find(
      (c) => Math.abs(c.price - pivot.price) < clusterThreshold,
    );
    if (existing) {
      existing.strength += pivot.strength;
      existing.price = (existing.price + pivot.price) / 2;
    } else {
      clusters.push({ ...pivot });
    }
  }

  // 5. Separate into support (below price) and resistance (above price)
  const resistance = clusters
    .filter((p) => p.price > currentPrice)
    .sort((a, b) => a.price - b.price)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .sort((a, b) => a.price - b.price);

  const support = clusters
    .filter((p) => p.price < currentPrice)
    .sort((a, b) => b.price - a.price)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .sort((a, b) => b.price - a.price);

  const decimals = currentPrice < 0.01 ? 6 : currentPrice < 0.1 ? 5 : currentPrice < 1 ? 4 : currentPrice < 10 ? 3 : 2;
  const factor = 10 ** decimals;

  const formatLevel = (p: Pivot, isSupport: boolean): SupportResistanceLevel => {
    const distancePercent = ((p.price - currentPrice) / currentPrice) * 100;
    const roundedPrice = Math.round(p.price * factor) / factor;
    const roundedDistance = Math.round(Math.abs(distancePercent) * 10) / 10;
    
    // Strength capped at 5 stars
    const cappedStrength = Math.min(5, p.strength);
    
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

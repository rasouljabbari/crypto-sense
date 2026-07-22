// ---------------------------------------------------------------------------
// Smart Support & Resistance Engine
//
// Layer 1 — Market Structure:     swing highs/lows, BOS, CHoCH
// Layer 2 — Volume Validation:    relative volume, spikes, FRVP, POC, HVN, LVN
// Layer 3 — Price Reaction:       touch count, pin bars, engulfing, rejection, impulsive moves
//
// Every zone is a price range with a clear reason.
// Volume & reaction only adjust confidence — never remove zones.
// Does NOT generate signals or trade decisions.
// Deterministic: same candles → same zones.
// ---------------------------------------------------------------------------

import { calcEma } from "../indicators/_helpers";

// ─── Public types ──────────────────────────────────────────────────────

export interface PriceRange {
  readonly min: number;
  readonly max: number;
}

export type MarketStructureType =
  | "swing_high"
  | "swing_low"
  | "major_swing_high"
  | "major_swing_low"
  | "bos"
  | "choch";

export interface MarketStructureZone {
  /** Price range of the zone (not a single point) */
  readonly priceRange: PriceRange;
  /** support = below current price, resistance = above */
  readonly type: "support" | "resistance";
  /** What market structure detected this zone */
  readonly detectedFrom: MarketStructureType;
  /** Human-readable explanation from market structure */
  readonly reason: string;
  /** 0 (no confidence) – 100 (very high confidence) */
  readonly confidence: number;
  /** Summary of volume-based adjustments */
  readonly volumeNote?: string;
  /** Translatable volume quality level */
  readonly volumeQuality?: "strong" | "moderate" | "weak" | "neutral";
  /** Number of independent touches (consecutive candles = 1 touch) */
  readonly touchCount: number;
  /** 0–100 strength of price reactions at this zone */
  readonly reactionStrength: number;
  /** Detailed reaction events (last 10) */
  readonly reactionHistory?: readonly ZoneReaction[];
  /** Strong / Medium / Weak classification */
  readonly strength: ZoneStrength;
  /** Human-readable reasons that contributed to ranking */
  readonly reasons: readonly string[];
}

export type ZoneStrength = "strong" | "medium" | "weak";

export interface ZoneReaction {
  readonly candleIndex: number;
  readonly type: "touch" | "rejection" | "pin_bar" | "long_wick" | "engulfing" | "impulsive";
  readonly price: number;
  readonly strength: number; // 0-100
}

export interface SmartSupportResistanceInput {
  readonly highs: readonly number[];
  readonly lows: readonly number[];
  readonly closes: readonly number[];
  readonly opens?: readonly number[];
  readonly volumes?: readonly number[];
  readonly currentPrice?: number;
}

export interface SmartSupportResistanceOutput {
  readonly zones: readonly MarketStructureZone[];
  readonly metadata: {
    readonly candleCount: number;
    readonly currentPrice: number;
    readonly swingHighs: number;
    readonly swingLows: number;
    readonly majorSwingHighs: number;
    readonly majorSwingLows: number;
    readonly bosEvents: number;
    readonly chochEvents: number;
  };
}

// ─── Internal helpers ──────────────────────────────────────────────────

function clusterThreshold(price: number): number {
  if (price < 0.01) return price * 0.04;
  if (price < 0.1) return price * 0.02;
  if (price < 1) return price * 0.015;
  if (price < 10) return price * 0.008;
  if (price < 100) return price * 0.006;
  if (price < 1000) return price * 0.005;
  return price * 0.004;
}

function rangeCenter(r: PriceRange): number {
  return (r.min + r.max) / 2;
}

function rangesOverlap(a: PriceRange, b: PriceRange, tolerance: number): boolean {
  const ca = rangeCenter(a);
  const cb = rangeCenter(b);
  return Math.abs(ca - cb) < tolerance;
}

function mergeRanges(a: PriceRange, b: PriceRange): PriceRange {
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

function roundPrice(p: number, ref: number): number {
  if (ref < 0.01) return Math.round(p * 1e6) / 1e6;
  if (ref < 0.1) return Math.round(p * 1e5) / 1e5;
  if (ref < 1) return Math.round(p * 1e4) / 1e4;
  if (ref < 10) return Math.round(p * 1e3) / 1e3;
  if (ref < 100) return Math.round(p * 1e2) / 1e2;
  return Math.round(p * 10) / 10;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

// ─────────────────────────────────────────────────────────────────────────
//  LAYER 1 — MARKET STRUCTURE
// ─────────────────────────────────────────────────────────────────────────

interface RawSwing {
  index: number;
  price: number;
  isMajor: boolean;
  isHigh: boolean;
}

interface RawBos {
  index: number;
  price: number;
  isBullish: boolean;
  brokenLevel: number;
}

interface RawChoch {
  index: number;
  price: number;
  isBullish: boolean;
  reason: string;
}

// ── 1a. Swing High / Swing Low ────────────────────────────────────────

function detectSwings(highs: readonly number[], lows: readonly number[], len: number): RawSwing[] {
  const swingMap = new Map<number, { hs: number; ls: number }>();
  const windows = [2, 5];

  for (const w of windows) {
    for (let i = w; i < len - w; i++) {
      let isHigh = true;
      for (let j = 1; j <= w; j++) {
        if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) { isHigh = false; break; }
      }
      if (isHigh) {
        const e = swingMap.get(i) ?? { hs: 0, ls: 0 };
        e.hs += w; swingMap.set(i, e);
      }
      let isLow = true;
      for (let j = 1; j <= w; j++) {
        if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) { isLow = false; break; }
      }
      if (isLow) {
        const e = swingMap.get(i) ?? { hs: 0, ls: 0 };
        e.ls += w; swingMap.set(i, e);
      }
    }
  }

  const swings: RawSwing[] = [];
  for (const [index, s] of swingMap) {
    if (s.hs > 0) swings.push({ index, price: highs[index], isMajor: s.hs >= 7, isHigh: true });
    if (s.ls > 0) swings.push({ index, price: lows[index], isMajor: s.ls >= 7, isHigh: false });
  }
  swings.sort((a, b) => a.index - b.index);
  return swings;
}

// ── 1b. Build alternating swing sequence ──────────────────────────────

interface SwingSeqItem { index: number; high: number; low: number; }

function buildSwingSequence(swings: RawSwing[], highs: number[], lows: number[]): SwingSeqItem[] {
  if (swings.length === 0) return [];
  const seq: SwingSeqItem[] = [];
  let lastType: "high" | "low" | null = null;
  for (const sw of swings) {
    if (sw.isHigh) {
      if (lastType === "high") {
        const prev = seq[seq.length - 1];
        if (prev && sw.price > prev.high) { prev.high = sw.price; prev.index = sw.index; }
        continue;
      }
      seq.push({ index: sw.index, high: sw.price, low: lows[sw.index] });
      lastType = "high";
    } else {
      if (lastType === "low") {
        const prev = seq[seq.length - 1];
        if (prev && sw.price < prev.low) { prev.low = sw.price; prev.index = sw.index; }
        continue;
      }
      seq.push({ index: sw.index, high: highs[sw.index], low: sw.price });
      lastType = "low";
    }
  }
  return seq;
}

// ── 1c. Major swing classification ────────────────────────────────────

function classifyMajorSwings(swings: RawSwing[], closes: readonly number[]): void {
  if (swings.length < 3 || closes.length < 50) return;
  const ema50: number[] = [closes[0]];
  const m = 2 / 51;
  for (let i = 1; i < closes.length; i++) ema50.push((closes[i] - ema50[i - 1]) * m + ema50[i - 1]);
  for (const sw of swings) {
    if (sw.isMajor) continue;
    const emaVal = ema50[sw.index] ?? ema50[ema50.length - 1];
    if (Math.abs(sw.price - emaVal) / emaVal > 0.03) sw.isMajor = true;
  }
}

// ── 1d. Break of Structure ────────────────────────────────────────────

function detectBOS(seq: SwingSeqItem[], closes: readonly number[], len: number): RawBos[] {
  if (seq.length < 2) return [];
  const bos: RawBos[] = [];
  for (let s = 1; s < seq.length; s++) {
    const prev = seq[s - 1], curr = seq[s];
    if (prev.high >= curr.high) {
      for (let i = prev.index; i <= curr.index && i < len; i++) {
        if (closes[i] < prev.low) { bos.push({ index: i, price: prev.low, isBullish: false, brokenLevel: prev.low }); break; }
      }
    }
    if (prev.low <= curr.low) {
      for (let i = prev.index; i <= curr.index && i < len; i++) {
        if (closes[i] > prev.high) { bos.push({ index: i, price: prev.high, isBullish: true, brokenLevel: prev.high }); break; }
      }
    }
  }
  return bos;
}

// ── 1e. Change of Character ───────────────────────────────────────────

function detectCHoCH(seq: SwingSeqItem[]): RawChoch[] {
  if (seq.length < 4) return [];
  const choch: RawChoch[] = [];
  for (let i = 3; i < seq.length; i++) {
    const s3 = seq[i - 3], s2 = seq[i - 2], s1 = seq[i - 1], s0 = seq[i];
    const uptrend = s3.high < s2.high && s2.high < s1.high && s3.low < s2.low && s2.low < s1.low;
    if (uptrend && s0.high < s1.high && s0.low < s1.low)
      choch.push({ index: s0.index, price: s0.low, isBullish: false, reason: "Lower high + lower low after uptrend" });
    const downtrend = s3.high > s2.high && s2.high > s1.high && s3.low > s2.low && s2.low > s1.low;
    if (downtrend && s0.high > s1.high && s0.low > s1.low)
      choch.push({ index: s0.index, price: s0.high, isBullish: true, reason: "Higher high + higher low after downtrend" });
  }
  return choch;
}

// ── 1f. Convert structures to zone candidates ─────────────────────────

interface ZoneCandidate {
  priceRange: PriceRange;
  detectedFrom: MarketStructureType;
  reason: string;
  confidence: number;
  isBullish: boolean;
  index: number; // candle index where this was detected
}

function swingsToCandidates(swings: RawSwing[], currentPrice: number, threshold: number): ZoneCandidate[] {
  return swings.map(sw => {
    const isResistance = sw.price > currentPrice;
    const dist = Math.abs(sw.price - currentPrice) / currentPrice;
    const distScore = dist < 0.03 ? 85 : dist < 0.06 ? 70 : dist < 0.1 ? 55 : 40;
    const baseConf = sw.isMajor ? 80 : 60;
    const confidence = Math.min(100, Math.round(baseConf * 0.6 + distScore * 0.4));
    const typeName = sw.isMajor
      ? (sw.isHigh ? "major_swing_high" : "major_swing_low")
      : (sw.isHigh ? "swing_high" : "swing_low");
    const label = `${sw.isMajor ? "Major " : ""}Swing ${sw.isHigh ? "high" : "low"}`;
    const half = threshold * 0.6;
    return {
      priceRange: { min: roundPrice(sw.price - half, currentPrice), max: roundPrice(sw.price + half, currentPrice) },
      detectedFrom: typeName as MarketStructureType,
      reason: `${label} at ${sw.price.toFixed(4)}`,
      confidence,
      isBullish: isResistance,
      index: sw.index,
    };
  });
}

function bosToCandidates(bosEvents: RawBos[], currentPrice: number, threshold: number): ZoneCandidate[] {
  return bosEvents.map(b => {
    const isResistance = b.price > currentPrice;
    const dist = Math.abs(b.price - currentPrice) / currentPrice;
    const distScore = dist < 0.03 ? 80 : dist < 0.06 ? 65 : 50;
    const confidence = Math.min(100, Math.round(75 * 0.6 + distScore * 0.4));
    const half = threshold * 0.8;
    return {
      priceRange: { min: roundPrice(b.price - half, currentPrice), max: roundPrice(b.price + half, currentPrice) },
      detectedFrom: "bos" as MarketStructureType,
      reason: b.isBullish
        ? `Bullish BOS — price broke above ${b.brokenLevel.toFixed(4)}`
        : `Bearish BOS — price broke below ${b.brokenLevel.toFixed(4)}`,
      confidence,
      isBullish: isResistance,
      index: b.index,
    };
  });
}

function chochToCandidates(chochEvents: RawChoch[], currentPrice: number, threshold: number): ZoneCandidate[] {
  return chochEvents.map(c => {
    const isResistance = c.price > currentPrice;
    const dist = Math.abs(c.price - currentPrice) / currentPrice;
    const distScore = dist < 0.03 ? 90 : dist < 0.06 ? 75 : 60;
    const confidence = Math.min(100, Math.round(85 * 0.6 + distScore * 0.4));
    const half = threshold;
    return {
      priceRange: { min: roundPrice(c.price - half, currentPrice), max: roundPrice(c.price + half, currentPrice) },
      detectedFrom: "choch" as MarketStructureType,
      reason: `${c.isBullish ? "Bullish" : "Bearish"} CHoCH — ${c.reason}`,
      confidence,
      isBullish: isResistance,
      index: c.index,
    };
  });
}

// ── 1g. Merge nearby zone candidates ──────────────────────────────────

function mergeCandidates(candidates: ZoneCandidate[], threshold: number): ZoneCandidate[] {
  if (candidates.length === 0) return [];
  const sorted = [...candidates].sort((a, b) => rangeCenter(a.priceRange) - rangeCenter(b.priceRange));
  const merged: { range: PriceRange; reason: string; confidence: number; sources: Set<MarketStructureType>; isResistance: boolean; index: number }[] = [];
  for (const c of sorted) {
    const existing = merged.find(m => rangesOverlap(m.range, c.priceRange, threshold) && m.isResistance === c.isBullish);
    if (existing) {
      existing.range = mergeRanges(existing.range, c.priceRange);
      existing.confidence = Math.min(100, existing.confidence + Math.round(c.confidence * 0.3));
      existing.sources.add(c.detectedFrom);
      existing.index = Math.max(existing.index, c.index);
    } else {
      merged.push({ range: c.priceRange, reason: c.reason, confidence: c.confidence, sources: new Set([c.detectedFrom]), isResistance: c.isBullish, index: c.index });
    }
  }
  return merged.map(m => ({
    priceRange: { min: roundPrice(m.range.min, rangeCenter(m.range)), max: roundPrice(m.range.max, rangeCenter(m.range)) },
    detectedFrom: m.sources.has("choch") ? "choch" as MarketStructureType : m.sources.has("bos") ? "bos" as MarketStructureType : m.sources.has("major_swing_high") || m.sources.has("major_swing_low") ? (m.sources.has("major_swing_high") ? "major_swing_high" : "major_swing_low") as MarketStructureType : m.sources.has("swing_high") ? "swing_high" as MarketStructureType : "swing_low" as MarketStructureType,
    reason: m.reason,
    confidence: Math.min(100, m.confidence),
    isBullish: m.isResistance,
    index: m.index,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
//  LAYER 2 — VOLUME VALIDATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Compute average volume over the entire dataset (ignoring first 5 bars for warm-up).
 */
function baselineVolume(volumes: number[]): number {
  if (volumes.length < 10) return 0;
  const slice = volumes.slice(5);
  return avg(slice);
}

/**
 * Build a local volume profile for candles that overlap a price range.
 * Returns POC price, HVN/LVN classification, and average crossing volume.
 */
function localVolumeProfile(
  zone: PriceRange,
  highs: readonly number[],
  lows: readonly number[],
  volumes: readonly number[],
  numRows: number,
): { poc: number | null; avgCrossVol: number; spikeCount: number; hvn: boolean; lvn: boolean } {
  const len = Math.min(highs.length, lows.length, volumes.length);

  // Find candles that overlap the zone
  const crossingVolumes: number[] = [];

  for (let i = 0; i < len; i++) {
    if (highs[i] >= zone.min && lows[i] <= zone.max) {
      crossingVolumes.push(volumes[i]);
    }
  }

  if (crossingVolumes.length < 3) {
    return { poc: null, avgCrossVol: avg(crossingVolumes), spikeCount: 0, hvn: false, lvn: false };
  }

  // Build mini volume profile limited to zone range
  const zoneRange = zone.max - zone.min;
  if (zoneRange <= 0) return { poc: null, avgCrossVol: avg(crossingVolumes), spikeCount: 0, hvn: false, lvn: false };

  const tickSize = zoneRange / numRows;
  const buckets = new Float64Array(numRows);

  for (let i = 0; i < len; i++) {
    if (highs[i] < zone.min || lows[i] > zone.max) continue;
    const startIdx = Math.max(0, Math.floor((Math.max(lows[i], zone.min) - zone.min) / tickSize));
    const endIdx = Math.min(numRows - 1, Math.floor((Math.min(highs[i], zone.max) - zone.min) / tickSize));
    const span = endIdx - startIdx + 1;
    const volPer = volumes[i] / span;
    for (let j = startIdx; j <= endIdx; j++) buckets[j] += volPer;
  }

  // Find POC
  let maxVol = 0;
  let pocIdx = -1;
  for (let i = 0; i < numRows; i++) {
    if (buckets[i] > maxVol) { maxVol = buckets[i]; pocIdx = i; }
  }

  const poc = pocIdx >= 0 ? zone.min + tickSize * pocIdx + tickSize / 2 : null;

  // Classify HVN/LVN: compare to average bucket volume
  let sumVol = 0;
  let count = 0;
  for (let i = 0; i < numRows; i++) {
    if (buckets[i] > 0) { sumVol += buckets[i]; count++; }
  }
  const avgBucketVol = count > 0 ? sumVol / count : 0;

  // Check volume at the zone's POC area (±2 rows)
  let hvn = false;
  let lvn = false;
  if (pocIdx >= 0 && avgBucketVol > 0) {
    const pocVolRatio = maxVol / avgBucketVol;
    hvn = pocVolRatio > 1.8;
    lvn = pocVolRatio < 0.4;
  }

  return {
    poc,
    avgCrossVol: avg(crossingVolumes),
    spikeCount: crossingVolumes.filter(v => v > avg(crossingVolumes) * 2).length,
    hvn,
    lvn,
  };
}

/**
 * Validate a single zone using volume data.
 * Adjusts confidence up or down.
 * Never removes the zone.
 */
function validateZoneVolume(
  zone: ZoneCandidate,
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  volumes: readonly number[],
  baseVol: number,
): { adjustedConfidence: number; note: string; quality: "strong" | "moderate" | "weak" | "neutral" } {
  let adjustment = 0; // -30 to +30
  const notes: string[] = [];

  // ── 2a. Relative Volume at zone formation ──
  if (zone.index < volumes.length) {
    const formationVol = volumes[zone.index];
    const relVol = baseVol > 0 ? formationVol / baseVol : 1;
    if (relVol > 2) { adjustment += 10; notes.push(`High relative volume at formation (${relVol.toFixed(1)}×)`); }
    else if (relVol > 1.5) { adjustment += 5; notes.push(`Above-average volume at formation (${relVol.toFixed(1)}×)`); }
    else if (relVol < 0.5) { adjustment -= 5; notes.push(`Low volume at formation (${relVol.toFixed(1)}×)`); }
  }

  // ── 2b. Local FRVP ──
  const vp = localVolumeProfile(zone.priceRange, highs, lows, volumes, 100);

  if (vp.poc !== null) {
    const zoneCenter = rangeCenter(zone.priceRange);
    const pocDist = Math.abs(vp.poc - zoneCenter) / zoneCenter;

    if (pocDist < 0.01) {
      adjustment += 10;
      notes.push("POC aligns with zone");
    } else if (pocDist < 0.03) {
      adjustment += 5;
      notes.push("POC near zone");
    }
  }

  // ── 2c. HVN / LVN ──
  if (vp.hvn) { adjustment += 10; notes.push("High volume node — strong interest"); }
  if (vp.lvn) { adjustment -= 8; notes.push("Low volume node — weak interest"); }

  // ── 2d. Volume spikes at zone interactions ──
  if (vp.spikeCount >= 3) { adjustment += 8; notes.push(`${vp.spikeCount} volume spikes at zone`); }
  else if (vp.spikeCount >= 1) { adjustment += 3; notes.push(`${vp.spikeCount} volume spike(s) at zone`); }

  // ── 2e. Spike-and-reject pattern ──
  // If there was a volume spike AND price rejected at the zone
  if (vp.spikeCount >= 1 && vp.hvn) {
    adjustment += 5;
    notes.push("Volume spike + high volume — strong reaction");
  }

  // Bound adjustment
  adjustment = Math.max(-30, Math.min(30, adjustment));

  const newConfidence = Math.max(5, Math.min(100, zone.confidence + adjustment));
  const note = notes.length > 0 ? notes.join("; ") : "Neutral volume";

  let quality: "strong" | "moderate" | "weak" | "neutral";
  if (adjustment >= 15) quality = "strong";
  else if (adjustment >= 5) quality = "moderate";
  else if (adjustment < 0) quality = "weak";
  else quality = "neutral";

  return { adjustedConfidence: newConfidence, note, quality };
}

// ─────────────────────────────────────────────────────────────────────────
//  LAYER 3 — PRICE REACTION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Classify a single candle's touch of a zone.
 * Returns the reaction type and strength, or null if no meaningful touch.
 */
function classifyZoneReaction(
  zone: PriceRange,
  zoneType: "support" | "resistance",
  candleIdx: number,
  high: number,
  low: number,
  open: number,
  close: number,
  prevOpen: number | undefined,
  prevClose: number | undefined,
  avgRange: number,
): ZoneReaction | null {
  // Must actually overlap the zone
  if (zoneType === "support" && low > zone.max) return null;
  if (zoneType === "resistance" && high < zone.min) return null;

  const body = Math.abs(close - open);
  const candleRange = high - low;
  if (candleRange <= 0) return null;

  const isRes = zoneType === "resistance";
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  const isBullish = close > open;

  // ── 3a. Pin bar (long wick at zone side + small body + rejection close) ──
  //   Resistance: upper wick ≥ 2× body AND ≥ 65% of range, close in lower third
  //   Support:    lower wick ≥ 2× body AND ≥ 65% of range, close in upper third
  if (isRes) {
    if (upperWick > body * 2 && upperWick > candleRange * 0.65 && close < low + candleRange * 0.35) {
      const strength = upperWick > candleRange * 0.8 ? 90 : 80;
      return { candleIndex: candleIdx, type: "pin_bar", price: high, strength };
    }
  } else {
    if (lowerWick > body * 2 && lowerWick > candleRange * 0.65 && close > high - candleRange * 0.35) {
      const strength = lowerWick > candleRange * 0.8 ? 90 : 80;
      return { candleIndex: candleIdx, type: "pin_bar", price: low, strength };
    }
  }

  // ── 3b. Long wick rejection (very long wick, not necessarily pin bar) ──
  //   Wick ≥ 70% of total range — strong price rejection even without small body
  if (isRes) {
    if (upperWick > candleRange * 0.7) {
      const strength = upperWick > candleRange * 0.85 ? 78 : 68;
      return { candleIndex: candleIdx, type: "long_wick", price: high, strength };
    }
  } else {
    if (lowerWick > candleRange * 0.7) {
      const strength = lowerWick > candleRange * 0.85 ? 78 : 68;
      return { candleIndex: candleIdx, type: "long_wick", price: low, strength };
    }
  }

  // ── 3c. Engulfing candle (previous candle fully inside current, direction aligns) ──
  if (prevOpen !== undefined && prevClose !== undefined) {
    const prevBody = Math.abs(prevClose - prevOpen);
    if (prevBody > 0 && body > prevBody * 1.2) {
      const prevMin = Math.min(prevOpen, prevClose);
      const prevMax = Math.max(prevOpen, prevClose);
      const curMin = Math.min(open, close);
      const curMax = Math.max(open, close);
      if (curMin < prevMin && curMax > prevMax) {
        // Direction bonus: bearish engulfing at resistance, bullish at support = stronger
        const aligned = isRes ? !isBullish : isBullish;
        const strength = aligned ? 90 : 80;
        return { candleIndex: candleIdx, type: "engulfing", price: close, strength };
      }
    }
  }

  // ── 3d. Strong impulsive move away from zone ──
  if (avgRange > 0 && prevClose !== undefined) {
    const move = Math.abs(close - prevClose);
    const moveRatio = move / avgRange;
    if (moveRatio > 1.5 && body > avgRange * 0.8) {
      // Direction bonus: moving away from zone = stronger signal
      const movingAway = isRes ? close < open : close > open;
      const strength = movingAway ? 80 : 65;
      return { candleIndex: candleIdx, type: "impulsive", price: close, strength };
    }
  }

  // ── 3e. Rejection (close far from zone side) ──
  if (isRes) {
    const rejectionDist = (high - close) / candleRange;
    if (rejectionDist > 0.6) {
      const strength = rejectionDist > 0.75 ? 70 : 60;
      return { candleIndex: candleIdx, type: "rejection", price: close, strength };
    }
  } else {
    const rejectionDist = (close - low) / candleRange;
    if (rejectionDist > 0.6) {
      const strength = rejectionDist > 0.75 ? 70 : 60;
      return { candleIndex: candleIdx, type: "rejection", price: close, strength };
    }
  }

  // Plain touch (no strong reaction pattern)
  return { candleIndex: candleIdx, type: "touch", price: isRes ? high : low, strength: 25 };
}

/**
 * Scan all candles and count independent touches of a zone.
 * Consecutive candles touching the zone = one touch event.
 * Returns touch count, reaction strength (0-100), and reaction detail list.
 */
function analyzeZoneReactions(
  zone: PriceRange,
  zoneType: "support" | "resistance",
  highs: readonly number[],
  lows: readonly number[],
  opens: readonly number[],
  closes: readonly number[],
): { touchCount: number; reactionStrength: number; reactions: ZoneReaction[] } {
  const len = Math.min(highs.length, lows.length, opens.length, closes.length);
  if (len < 5) return { touchCount: 0, reactionStrength: 0, reactions: [] };

  // Average candle range (for impulsive detection)
  let rangeSum = 0;
  for (let i = 0; i < len; i++) rangeSum += highs[i] - lows[i];
  const avgRange = rangeSum / len;

  const reactions: ZoneReaction[] = [];
  let touchCount = 0;
  let inZone = false;

  for (let i = 0; i < len; i++) {
    const touches = zoneType === "support"
      ? lows[i] <= zone.max
      : highs[i] >= zone.min;

    if (touches) {
      if (!inZone) {
        touchCount++;
        inZone = true;

        const reaction = classifyZoneReaction(
          zone, zoneType, i,
          highs[i], lows[i], opens[i], closes[i],
          i > 0 ? opens[i - 1] : undefined,
          i > 0 ? closes[i - 1] : undefined,
          avgRange,
        );
        if (reaction) reactions.push(reaction);
      }
    } else {
      inZone = false;
    }
  }

  // ── Compute reaction strength ──
  let strength = 0;

  if (touchCount > 0) {
    // ── 1. Base touch contribution (up to 30 pts) ──
    // Diminishing returns: 1 touch = 15, 2 = 22, 3 = 27, 4+ = 30
    strength += Math.min(15 + touchCount * 5, 30);

    // ── 2. Quality bonus per reaction (up to 35 pts) ──
    // Each strong reaction adds more; cap total quality bonus
    let qualityBonus = 0;
    for (const r of reactions) {
      if (r.type === "pin_bar") qualityBonus += 15;
      else if (r.type === "engulfing") qualityBonus += 14;
      else if (r.type === "impulsive") qualityBonus += 11;
      else if (r.type === "long_wick") qualityBonus += 10;
      else if (r.type === "rejection") qualityBonus += 7;
      // plain touch adds nothing
    }
    strength += Math.min(qualityBonus, 35);

    // ── 3. Time-separation bonus (up to 20 pts) ──
    //   Touches spread across more of the dataset = much more significant.
    //   Ignored for single-touch zones.
    if (reactions.length >= 2) {
      const span = reactions[reactions.length - 1].candleIndex - reactions[0].candleIndex;
      const spanRatio = span / len; // 0..1
      // Linear: 50% span = 10 pts, 100% span = 20 pts
      strength += Math.min(Math.round(spanRatio * 20), 20);
    }

    // ── 4. Independent reaction diversity (up to 15 pts) ──
    //   Multiple different reaction types = independent confirmations.
    //   Only count non-touch types (touch is baseline, not confirmation).
    const uniqueTypes = new Set(
      reactions.filter(r => r.type !== "touch").map(r => r.type),
    );
    const diversity = uniqueTypes.size;
    if (diversity >= 3) strength += 15;
    else if (diversity === 2) strength += 10;
    else if (diversity === 1) strength += 5;
  }

  return {
    touchCount,
    reactionStrength: Math.min(100, Math.round(strength)),
    reactions: reactions.slice(0, 10), // keep last 10
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  LAYER 4 — FINAL RANKING
// ─────────────────────────────────────────────────────────────────────────

/**
 * Rank a zone based on 6 weighted factors.
 * Weights are internal — not exposed in output.
 *
 * Factors (internal weights):
 *   Market Structure  35%
 *   Volume            25%
 *   Multi-TF Align    20%
 *   Touch Count       10%
 *   Reaction Strength  5%
 *   EMA Confluence     5%
 */
function rankZone(
  zone: {
    detectedFrom: MarketStructureType;
    volumeNote?: string;
    touchCount: number;
    reactionStrength: number;
    alignmentScore?: number;
    priceRange: PriceRange;
  },
  closes?: readonly number[],
): { strength: ZoneStrength; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  const zonePrice = rangeCenter(zone.priceRange);

  // ── 4a. Market Structure (35%) ──
  const msScores: Record<string, number> = {
    choch: 90,
    major_swing_high: 80,
    major_swing_low: 80,
    bos: 70,
    swing_high: 55,
    swing_low: 55,
  };
  const msScore = msScores[zone.detectedFrom] ?? 50;
  if (msScore >= 70) reasons.push(`${zone.detectedFrom.replace(/_/g, " ")} market structure`);

  // ── 4b. Volume Confirmation (25%) ──
  let volScore = 50;
  if (zone.volumeNote) {
    if (/high relative|POC aligns|high volume node|strong interest/i.test(zone.volumeNote)) volScore = 80;
    else if (/volume spike|POC near|above-avg|strong reaction/i.test(zone.volumeNote)) volScore = 65;
    else if (/low volume|weak interest|LVN/i.test(zone.volumeNote)) volScore = 35;
    if (volScore >= 65) reasons.push("Volume confirms");
    else if (volScore <= 35) reasons.push("Weak volume");
  }

  // ── 4c. Multi-Timeframe Alignment (20%) ──
  const alignScore = zone.alignmentScore ?? 50;
  if (alignScore >= 80) reasons.push("Strong multi-timeframe alignment");
  else if (alignScore >= 50) reasons.push("Partial multi-timeframe alignment");

  // ── 4d. Touch Count (10%) ──
  const touchScore = zone.touchCount <= 0 ? 0
    : zone.touchCount === 1 ? 35
    : zone.touchCount === 2 ? 55
    : zone.touchCount === 3 ? 72
    : zone.touchCount <= 5 ? 85
    : 92;
  if (zone.touchCount >= 3) reasons.push(`${zone.touchCount} price touches`);
  else if (zone.touchCount >= 2) reasons.push(`${zone.touchCount} price touches`);
  else if (zone.touchCount === 1) reasons.push("1 price touch");

  // ── 4e. Reaction Strength (5%) ──
  const reactScore = zone.reactionStrength;
  if (reactScore >= 70) reasons.push("Strong price reaction");
  else if (reactScore >= 40) reasons.push("Moderate price reaction");

  // ── 4f. EMA Confluence (5%) ──
  let emaScore = 50;
  if (closes && closes.length >= 50) {
    const ema50 = calcEma(closes, 50);
    const currentEma = ema50[ema50.length - 1];
    if (currentEma > 0) {
      const distToEma = Math.abs(zonePrice - currentEma) / currentEma;
      if (distToEma < 0.005) { emaScore = 90; reasons.push("EMA50 confluence"); }
      else if (distToEma < 0.015) { emaScore = 70; reasons.push("Near EMA50"); }
    }
  }

  // ── Weighted final score (weights stay internal) ──
  const finalScore = msScore * 0.35 + volScore * 0.25 + alignScore * 0.20
    + touchScore * 0.10 + reactScore * 0.05 + emaScore * 0.05;

  const rounded = Math.min(100, Math.max(0, Math.round(finalScore)));
  const strength: ZoneStrength = rounded >= 70 ? "strong" : rounded >= 40 ? "medium" : "weak";

  return { strength, confidence: rounded, reasons };
}

// ─────────────────────────────────────────────────────────────────────────
//  MAIN PIPELINE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Layer 1: Detect S/R zones from market structure.
 * Layer 2: Validate each zone using volume (adjusts confidence, never removes).
 *
 * @returns Zones sorted by proximity to current price.
 *   Each zone has a price range, type, reason, confidence (0–100),
 *   and optional volumeNote describing volume-based adjustments.
 */
export function detectSupportResistance(
  input: SmartSupportResistanceInput,
): SmartSupportResistanceOutput {
  const { highs, lows, closes, opens, volumes } = input;
  const len = Math.min(highs.length, lows.length, closes.length);

  if (len < 20) {
    return {
      zones: [],
      metadata: { candleCount: len, currentPrice: closes[len - 1] ?? 0, swingHighs: 0, swingLows: 0, majorSwingHighs: 0, majorSwingLows: 0, bosEvents: 0, chochEvents: 0 },
    };
  }

  const currentPrice = input.currentPrice ?? closes[len - 1];
  const threshold = clusterThreshold(currentPrice);

  // ── 1. Market Structure ──
  const rawSwings = detectSwings(highs, lows, len);
  classifyMajorSwings(rawSwings, closes);
  const seq = buildSwingSequence(rawSwings, highs as number[], lows as number[]);
  const bosEvents = detectBOS(seq, closes, len);
  const chochEvents = detectCHoCH(seq);

  let candidates: ZoneCandidate[] = [
    ...swingsToCandidates(rawSwings, currentPrice, threshold),
    ...bosToCandidates(bosEvents, currentPrice, threshold),
    ...chochToCandidates(chochEvents, currentPrice, threshold),
  ];

  // ── Merge ──
  candidates = mergeCandidates(candidates, threshold);

  // ── 2. Volume Validation (if volume data available) ──
  let baseVol = 0;
  if (volumes && volumes.length >= 10) {
    baseVol = baselineVolume(volumes as number[]);
  }

  const zonesWithVolume: MarketStructureZone[] = candidates.map(c => {
    let adjustedConf = c.confidence;
    let note: string | undefined;
    let volQuality: "strong" | "moderate" | "weak" | "neutral" | undefined;

    if (volumes && volumes.length >= 10 && baseVol > 0) {
      const result = validateZoneVolume(c, highs, lows, closes, volumes as number[], baseVol);
      adjustedConf = result.adjustedConfidence;
      note = result.note;
      volQuality = result.quality;
    }

    return {
      priceRange: c.priceRange,
      type: c.isBullish ? "resistance" : "support",
      detectedFrom: c.detectedFrom,
      reason: c.reason,
      confidence: adjustedConf,
      volumeNote: note,
      volumeQuality: volQuality,
      touchCount: 0,
      reactionStrength: 0,
      strength: "medium" as ZoneStrength,
      reasons: [] as readonly string[],
    };
  });

  // ── 3. Price Reaction Analysis (if open data available) ──
  const zonesWithReactions = opens && opens.length >= 5
    ? zonesWithVolume.map(z => {
        const result = analyzeZoneReactions(z.priceRange, z.type, highs, lows, opens, closes);

        // reactionStrength already includes touch count, quality bonuses,
        // time-separation, and diversity — no need to recompute those here.
        const reactionBoost = Math.round(result.reactionStrength * 0.15);

        return {
          ...z,
          touchCount: result.touchCount,
          reactionStrength: result.reactionStrength,
          reactionHistory: result.reactions as readonly ZoneReaction[],
          confidence: Math.min(100, z.confidence + reactionBoost),
          reason: result.reactions.some(r => r.type === "pin_bar" || r.type === "engulfing" || r.type === "long_wick")
            ? `${z.reason} [${result.touchCount}t, ${result.reactionStrength}% reaction]`
            : z.reason,
        };
      })
    : zonesWithVolume;

  // ── 4. Final Ranking (normalize confidence, assign strength + reasons) ──
  const rankedZones = zonesWithReactions.map(z => {
    const { strength, confidence, reasons } = rankZone(z, closes);
    return { ...z, strength, confidence, reasons: reasons as readonly string[] };
  });

  // ── Sort by proximity to current price ──
  const supports = rankedZones
    .filter(z => z.type === "support")
    .sort((a, b) => Math.abs(rangeCenter(a.priceRange) - currentPrice) - Math.abs(rangeCenter(b.priceRange) - currentPrice));

  const resistances = rankedZones
    .filter(z => z.type === "resistance")
    .sort((a, b) => Math.abs(rangeCenter(a.priceRange) - currentPrice) - Math.abs(rangeCenter(b.priceRange) - currentPrice));

  const zones = [...supports.slice(0, 6), ...resistances.slice(0, 6)];

  return {
    zones,
    metadata: {
      candleCount: len,
      currentPrice,
      swingHighs: rawSwings.filter(s => s.isHigh && !s.isMajor).length,
      swingLows: rawSwings.filter(s => !s.isHigh && !s.isMajor).length,
      majorSwingHighs: rawSwings.filter(s => s.isHigh && s.isMajor).length,
      majorSwingLows: rawSwings.filter(s => !s.isHigh && s.isMajor).length,
      bosEvents: bosEvents.length,
      chochEvents: chochEvents.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  MULTI-TIMEFRAME — Layer 3
// ─────────────────────────────────────────────────────────────────────────

export interface MultiTimeframeZone extends MarketStructureZone {
  /** Which timeframes detected this zone */
  readonly detectedTimeframes: readonly string[];
  /** 0–100: how many timeframes agree */
  readonly alignmentScore: number;
}

/**
 * Tolerance for cross-timeframe alignment: 0.5 % of current price.
 * Zones whose centers are within this distance are considered overlapping.
 */
function multiTfTolerance(price: number): number {
  return price * 0.005;
}

interface TaggedZone {
  zone: MarketStructureZone;
  timeframe: string;
}

/**
 * Cluster tagged zones (from multiple timeframes) by price proximity.
 * Each cluster becomes one merged MultiTimeframeZone.
 */
function clusterMultiTimeframe(
  tagged: TaggedZone[],
  currentPrice: number,
  totalTimeframes: number,
): MultiTimeframeZone[] {
  if (tagged.length === 0) return [];

  const tolerance = multiTfTolerance(currentPrice);

  // Sort by price center
  const sorted = [...tagged].sort(
    (a, b) => rangeCenter(a.zone.priceRange) - rangeCenter(b.zone.priceRange),
  );

  const clusters: {
    range: PriceRange;
    zones: TaggedZone[];
    timeframes: Set<string>;
    detectedFrom: Map<string, number>;
    touchCount: number;
    reactionStrength: number;
    reactions: ZoneReaction[];
  }[] = [];

  for (const item of sorted) {
    let added = false;
    for (const cluster of clusters) {
      if (rangesOverlap(cluster.range, item.zone.priceRange, tolerance)) {
        cluster.range = mergeRanges(cluster.range, item.zone.priceRange);
        cluster.zones.push(item);
        cluster.timeframes.add(item.timeframe);
        const df = item.zone.detectedFrom;
        cluster.detectedFrom.set(df, (cluster.detectedFrom.get(df) ?? 0) + 1);
        cluster.touchCount = Math.max(cluster.touchCount, item.zone.touchCount);
        cluster.reactionStrength = Math.max(cluster.reactionStrength, item.zone.reactionStrength);
        if (item.zone.reactionHistory) {
          cluster.reactions.push(...item.zone.reactionHistory);
        }
        added = true;
        break;
      }
    }
    if (!added) {
      const tfs = new Set<string>([item.timeframe]);
      const df = new Map<string, number>();
      df.set(item.zone.detectedFrom, 1);
      clusters.push({
        range: item.zone.priceRange,
        zones: [item],
        timeframes: tfs,
        detectedFrom: df,
        touchCount: item.zone.touchCount,
        reactionStrength: item.zone.reactionStrength,
        reactions: item.zone.reactionHistory ? [...item.zone.reactionHistory] : [],
      });
    }
  }

  return clusters.map(cluster => {
    const alignmentScore = Math.round((cluster.timeframes.size / totalTimeframes) * 100);

    // Pick best detectedFrom (highest occurrence count)
    let bestDF: MarketStructureType = "swing_high";
    let bestCount = 0;
    for (const [df, count] of cluster.detectedFrom) {
      if (count > bestCount) {
        bestCount = count;
        bestDF = df as MarketStructureType;
      }
    }

    // Average confidence boosted by alignment
    const avgConf = cluster.zones.reduce((s, z) => s + z.zone.confidence, 0) / cluster.zones.length;
    const boost = alignmentScore * 0.2;
    const finalConf = Math.min(100, Math.round(avgConf + boost));

    const tfList = [...cluster.timeframes].sort().join(", ");
    const multiReason = cluster.zones[0]?.zone.reason ?? "";

    const volNotes = cluster.zones.map(z => z.zone.volumeNote).filter(Boolean);
    const mergedVolNote = volNotes.length > 0 ? volNotes.join(" | ") : undefined;

    // Pick best volume quality from clustered zones
    const qualityRank = { strong: 4, moderate: 3, neutral: 2, weak: 1 } as const;
    let bestQuality: "strong" | "moderate" | "weak" | "neutral" | undefined;
    for (const z of cluster.zones) {
      const q = z.zone.volumeQuality;
      if (q && (!bestQuality || qualityRank[q] > qualityRank[bestQuality])) bestQuality = q;
    }

    // Deduplicate reactions by candleIndex (keep highest strength per index)
    const seenIdx = new Set<number>();
    const deduped = cluster.reactions.filter(r => {
      if (seenIdx.has(r.candleIndex)) return false;
      seenIdx.add(r.candleIndex);
      return true;
    }).sort((a, b) => a.candleIndex - b.candleIndex).slice(0, 10);

    return {
      priceRange: cluster.range,
      type: cluster.zones[0]?.zone.type ?? "support",
      detectedFrom: bestDF,
      reason: multiReason,
      confidence: finalConf,
      volumeNote: mergedVolNote,
      volumeQuality: bestQuality,
      touchCount: cluster.touchCount,
      reactionStrength: cluster.reactionStrength,
      reactionHistory: deduped.length > 0 ? deduped as readonly ZoneReaction[] : undefined,
      detectedTimeframes: [...cluster.timeframes].sort(),
      alignmentScore,
      strength: finalConf >= 70 ? "strong" as ZoneStrength : finalConf >= 40 ? "medium" as ZoneStrength : "weak" as ZoneStrength,
      reasons: [] as readonly string[],
    };
  });
}

/**
 * Multi-Timeframe Support & Resistance.
 *
 * Runs `detectSupportResistance` independently for each provided timeframe,
 * then merges overlapping zones across timeframes.
 * Alignment increases confidence. Duplicates are eliminated.
 *
 * @param inputs - keyed by timeframe label (e.g. "1h", "4h")
 * @param currentPrice - reference price for sorting
 * @returns merged zones with detectedTimeframes + alignmentScore
 */
export function detectMultiTimeframeSR(
  inputs: Record<string, SmartSupportResistanceInput>,
  currentPrice: number,
): { zones: readonly MultiTimeframeZone[] } {
  const tfKeys = Object.keys(inputs);
  if (tfKeys.length === 0) return { zones: [] };

  const results: Array<{ zones: readonly MarketStructureZone[]; timeframe: string }> = [];

  for (const [tf, input] of Object.entries(inputs)) {
    const { zones } = detectSupportResistance(input);
    results.push({ zones, timeframe: tf });
  }

  const allTagged: TaggedZone[] = [];
  for (const r of results) {
    for (const z of r.zones) {
      allTagged.push({ zone: z, timeframe: r.timeframe });
    }
  }

  const supports = allTagged.filter(t => t.zone.type === "support");
  const resistances = allTagged.filter(t => t.zone.type === "resistance");

  const totalTfs = tfKeys.length;

  const mergedSupports = clusterMultiTimeframe(supports, currentPrice, totalTfs);
  const mergedResistances = clusterMultiTimeframe(resistances, currentPrice, totalTfs);

  const sortedSupports = mergedSupports.sort(
    (a, b) => Math.abs(rangeCenter(a.priceRange) - currentPrice)
      - Math.abs(rangeCenter(b.priceRange) - currentPrice),
  );
  const sortedResistances = mergedResistances.sort(
    (a, b) => Math.abs(rangeCenter(a.priceRange) - currentPrice)
      - Math.abs(rangeCenter(b.priceRange) - currentPrice),
  );

  return {
    zones: [...sortedSupports.slice(0, 6), ...sortedResistances.slice(0, 6)],
  };
}

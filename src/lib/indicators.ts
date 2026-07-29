import type { ChartDataPoint } from "./types";

/* ─── EMA ─────────────────────────────────────────────────────────────── */

function ema(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1];
  const k = 2 / (period + 1);
  let result = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return Math.round(result * 100) / 100;
}

/* ─── RSI (Wilder's smoothed) ────────────────────────────────────────── */

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/* ─── MACD ────────────────────────────────────────────────────────────── */

function calcMACD(closes: number[]): { value: number; signal: number; histogram: number } {
  const src = closes;
  if (src.length < 35) {
    return { value: 0, signal: 0, histogram: 0 };
  }
  const ema12 = ema(src, 12);
  const ema26 = ema(src, 26);
  const macdValue = Math.round((ema12 - ema26) * 100) / 100;

  // Signal line: EMA of MACD values (need MACD series → compute iteratively)
  const macdSeries: number[] = [];
  for (let i = 0; i < src.length; i++) {
    if (i < 25) continue;
    const seg = src.slice(0, i + 1);
    const e12 = ema(seg, 12);
    const e26 = ema(seg, 26);
    macdSeries.push(e12 - e26);
  }
  const signalLine = ema(macdSeries, 9);
  const histogram = Math.round((macdValue - signalLine) * 100) / 100;
  return { value: macdValue, signal: Math.round(signalLine * 100) / 100, histogram };
}

/* ─── ATR (Wilder's smoothed) ────────────────────────────────────────── */

function calcATR(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
): number {
  const len = high.length;
  if (len < period + 1) return 0;
  const tr: number[] = [];
  for (let i = 1; i < len; i++) {
    const h = high[i], l = low[i], pc = close[i - 1];
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
  }
  return Math.round(atr * 100) / 100;
}

/* ─── ADX (Wilder's) ─────────────────────────────────────────────────── */

function calcADX(
  high: number[],
  low: number[],
  close: number[],
  period = 14,
): { adx: number; plusDI: number; minusDI: number } {
  const len = high.length;
  if (len < period * 2 + 1) return { adx: 20, plusDI: 25, minusDI: 25 };

  const tr: number[] = [];
  const pdm: number[] = [];
  const mdm: number[] = [];
  for (let i = 1; i < len; i++) {
    const h = high[i], l = low[i], pc = close[i - 1];
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    pdm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    mdm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  let sTR = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let sPDM = pdm.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let sMDM = mdm.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const dxValues: number[] = [];
  const calcDI = (a: number) => (sTR === 0 ? 0 : (a / sTR) * 100);

  for (let i = period; i < tr.length; i++) {
    sTR = (sTR * (period - 1) + tr[i]) / period;
    sPDM = (sPDM * (period - 1) + pdm[i]) / period;
    sMDM = (sMDM * (period - 1) + mdm[i]) / period;
    const pDI = calcDI(sPDM);
    const mDI = calcDI(sMDM);
    const dx = pDI + mDI === 0 ? 0 : (Math.abs(pDI - mDI) / (pDI + mDI)) * 100;
    dxValues.push(dx);
  }

  // ADX = smoothed DX over period
  const adx = dxValues.length >= period
    ? dxValues.slice(-period).reduce((a, b) => a + b, 0) / period
    : 20;

  const lastPDI = calcDI(sPDM);
  const lastMDI = calcDI(sMDM);

  return {
    adx: Math.round(adx * 10) / 10,
    plusDI: Math.round(lastPDI * 10) / 10,
    minusDI: Math.round(lastMDI * 10) / 10,
  };
}

/* ─── Support / Resistance (from price action) ──────────────────────── */

function calcSupportResistance(
  high: number[],
  low: number[],
  close: number[],
  currentPrice: number,
): { supportLevels: number[]; resistanceLevels: number[] } {
  const levels: number[] = [];
  const threshold = currentPrice * 0.003;

  // Detect swing highs/lows
  for (let i = 2; i < high.length - 2; i++) {
    if (high[i] > high[i - 1] && high[i] > high[i - 2] &&
        high[i] > high[i + 1] && high[i] > high[i + 2]) {
      levels.push(high[i]);
    }
    if (low[i] < low[i - 1] && low[i] < low[i - 2] &&
        low[i] < low[i + 1] && low[i] < low[i + 2]) {
      levels.push(low[i]);
    }
  }

  // Also use recent high/low as S/R
  levels.push(Math.max(...high.slice(-5)));
  levels.push(Math.min(...low.slice(-5)));

  // Deduplicate nearby levels
  const sorted = [...new Set(levels)].sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const l of sorted) {
    if (deduped.length === 0 || Math.abs(l - deduped[deduped.length - 1]) > threshold) {
      deduped.push(Math.round(l * 100) / 100);
    }
  }

  const supports = deduped.filter((p) => p < currentPrice).sort((a, b) => b - a).slice(0, 3);
  const resistances = deduped.filter((p) => p > currentPrice).sort((a, b) => a - b).slice(0, 3);

  // Pad to at least 3 levels each
  while (supports.length < 3) {
    const next = supports.length === 0
      ? currentPrice * 0.95
      : supports[supports.length - 1] * 0.985;
    supports.push(Math.round(next * 100) / 100);
  }
  while (resistances.length < 3) {
    const next = resistances.length === 0
      ? currentPrice * 1.05
      : resistances[resistances.length - 1] * 1.015;
    resistances.push(Math.round(next * 100) / 100);
  }

  return { supportLevels: supports, resistanceLevels: resistances };
}

/* ─── Bollinger Bands ────────────────────────────────────────────────── */

function calcBB(
  closes: number[],
  currentPrice: number,
  period = 20,
  multiplier = 2,
): { upper: number; middle: number; lower: number } {
  const middle = closes.length >= period
    ? closes.slice(-period).reduce((a, b) => a + b, 0) / period
    : currentPrice;
  const variance = closes.length >= period
    ? closes.slice(-period).reduce((sum, v) => sum + (v - middle) ** 2, 0) / period
    : 0;
  const stddev = Math.sqrt(variance);
  return {
    upper: Math.round((middle + multiplier * stddev) * 100) / 100,
    middle: Math.round(middle * 100) / 100,
    lower: Math.round((middle - multiplier * stddev) * 100) / 100,
  };
}

/* ─── Public API ──────────────────────────────────────────────────────── */

/**
 * Compute all technical indicators from OHLCV kline data.
 * Deterministic — no random numbers, no seeded PRNG.
 * Falls back to sensible defaults if insufficient data.
 */
export function computeTechnicalIndicators(klines: ChartDataPoint[]): import("./types").TechnicalIndicators {
  const closes = klines.map((k) => k.close);
  const highs = klines.map((k) => k.high);
  const lows = klines.map((k) => k.low);
  const currentPrice = closes[closes.length - 1] ?? 0;

  const volumes = klines.map((k) => k.volume);
  const rsi = klines.length >= 15 ? calcRSI(closes) : 50;
  const dmi = calcADX(highs, lows, closes);
  const atr = calcATR(highs, lows, closes);
  const macd = calcMACD(closes);
  const ema9Val = klines.length >= 9 ? ema(closes, 9) : currentPrice;
  const ema20Val = klines.length >= 20 ? ema(closes, 20) : currentPrice;
  const ema21Val = klines.length >= 21 ? ema(closes, 21) : currentPrice;
  const ema50Val = klines.length >= 50 ? ema(closes, 50) : currentPrice;
  const ema200Val = klines.length >= 200 ? ema(closes, 200) : currentPrice;
  const bb = calcBB(closes, currentPrice);
  const { supportLevels, resistanceLevels } = calcSupportResistance(highs, lows, closes, currentPrice);

  // Price change % over the last kline period (matches selected timeframe)
  const prevClose = closes.length >= 2 ? closes[closes.length - 2] : currentPrice;
  const priceChangePercent = prevClose > 0
    ? Math.round(((currentPrice - prevClose) / prevClose) * 10000) / 100
    : 0;

  // Volume change %: current volume vs average of last 7 periods
  const currentVol = volumes[volumes.length - 1] ?? 0;
  const lookback = Math.min(7, volumes.length - 1);
  const avgVol = lookback > 0
    ? volumes.slice(-lookback - 1, -1).reduce((a, b) => a + b, 0) / lookback
    : currentVol;
  const volumeChangePercent = avgVol > 0
    ? Math.round(((currentVol - avgVol) / avgVol) * 100)
    : 0;

  return {
    rsi,
    macd,
    ema9: ema9Val,
    ema20: ema20Val,
    ema21: ema21Val,
    ema50: ema50Val,
    ema200: ema200Val,
    bollingerBands: bb,
    supportLevels,
    resistanceLevels,
    adx: dmi.adx,
    plusDI: dmi.plusDI,
    minusDI: dmi.minusDI,
    atr,
    volumeChangePercent,
    priceChangePercent,
  };
}

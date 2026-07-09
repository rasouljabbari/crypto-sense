// ---------------------------------------------------------------------------
// Shared math utilities for indicator calculations
// ---------------------------------------------------------------------------

export function isValidNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export function lastValid(values: readonly number[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isValidNumber(values[i])) return values[i];
  }
  return 0;
}

// ─── Simple Moving Average (full array) ──────────────────────────────────

export function calcSma(values: readonly number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j];
    result.push(sum / period);
  }
  return result;
}

// ─── Exponential Moving Average (full array) ────────────────────────────

export function calcEma(values: readonly number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += values[i - j];
      ema = sum / period;
      result.push(ema);
    } else {
      ema = (values[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

// ─── Wilder's Smoothing (used by RSI, ADX) ──────────────────────────────

export function wilderSmooth(
  values: readonly number[],
  period: number,
): number[] {
  const result: number[] = [];
  let smoothed = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      smoothed += values[i];
      if (i === period - 1) {
        smoothed /= period;
        result.push(smoothed);
      } else {
        result.push(NaN);
      }
    } else {
      smoothed = (smoothed * (period - 1) + values[i]) / period;
      result.push(smoothed);
    }
  }
  return result;
}

// ─── True Range ──────────────────────────────────────────────────────────

export function calcTrueRange(
  high: number,
  low: number,
  prevClose: number,
): number {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose),
  );
}

// ─── Typical Price ───────────────────────────────────────────────────────

export function calcTypicalPrice(
  high: number,
  low: number,
  close: number,
): number {
  return (high + low + close) / 3;
}

// ─── Standard Deviation ──────────────────────────────────────────────────

export function calcStdDev(
  values: readonly number[],
  period: number,
  mean: number,
): number {
  let sumSq = 0;
  const start = values.length - period;
  for (let i = start; i < values.length; i++) {
    sumSq += (values[i] - mean) ** 2;
  }
  return Math.sqrt(sumSq / period);
}

// ─── Highest / Lowest in range ───────────────────────────────────────────

export function highest(values: readonly number[], period: number): number {
  const start = Math.max(0, values.length - period);
  let max = -Infinity;
  for (let i = start; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

export function lowest(values: readonly number[], period: number): number {
  const start = Math.max(0, values.length - period);
  let min = Infinity;
  for (let i = start; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}

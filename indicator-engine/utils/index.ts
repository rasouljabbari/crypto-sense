export function isValid(value: number): boolean {
  return Number.isFinite(value);
}

export function lastValid(values: readonly number[]): number {
  for (let i = values.length - 1; i >= 0; i--) {
    if (isValid(values[i])) return values[i];
  }
  return 0;
}

export function round(value: number, decimals: number = 2): number {
  if (!isValid(value)) return 0;
  const mult = 10 ** decimals;
  return Math.round(value * mult) / mult;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function findFirstValidWindow(
  values: readonly number[],
  period: number,
): number {
  for (let i = 0; i <= values.length - period; i++) {
    let allValid = true;
    for (let j = i; j < i + period; j++) {
      if (!isValid(values[j])) { allValid = false; break; }
    }
    if (allValid) return i + period - 1;
  }
  return -1;
}

export function calcSma(values: readonly number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period || period <= 0) return result;

  const seedIdx = findFirstValidWindow(values, period);
  if (seedIdx === -1) return result;

  let sum = 0;
  for (let i = seedIdx - period + 1; i <= seedIdx; i++) sum += values[i];
  result[seedIdx] = sum / period;

  for (let i = seedIdx + 1; i < values.length; i++) {
    if (!isValid(values[i])) continue;
    sum = sum - values[i - period] + values[i];
    result[i] = sum / period;
  }

  return result;
}

export function calcEma(values: readonly number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period || period <= 0) return result;

  const multiplier = 2 / (period + 1);
  const seedIdx = findFirstValidWindow(values, period);
  if (seedIdx === -1) return result;

  let sum = 0;
  for (let i = seedIdx - period + 1; i <= seedIdx; i++) sum += values[i];
  result[seedIdx] = sum / period;

  for (let i = seedIdx + 1; i < values.length; i++) {
    if (!isValid(values[i])) continue;
    const prev = result[i - 1];
    if (!isValid(prev)) {
      result[i] = values[i];
    } else {
      result[i] = (values[i] - prev) * multiplier + prev;
    }
  }

  return result;
}

export function calcWilderSmooth(
  values: readonly number[],
  period: number,
): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period + 1 || period <= 0) return result;

  const seedIdx = findFirstValidWindow(values, period);
  if (seedIdx === -1) return result;

  let sum = 0;
  for (let i = seedIdx - period + 1; i <= seedIdx; i++) sum += values[i];
  result[seedIdx] = sum / period;

  for (let i = seedIdx + 1; i < values.length; i++) {
    if (!isValid(values[i])) continue;
    const prev = result[i - 1];
    if (!isValid(prev)) {
      result[i] = values[i];
    } else {
      result[i] = (values[i] - prev) / period + prev;
    }
  }

  return result;
}

export function calcTrueRange(
  high: number,
  low: number,
  prevClose: number,
): number {
  if (!isValid(high) || !isValid(low) || !isValid(prevClose)) return 0;
  return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
}

export function calcTypicalPrice(
  high: number,
  low: number,
  close: number,
): number {
  if (!isValid(high) || !isValid(low) || !isValid(close)) return 0;
  return (high + low + close) / 3;
}

export function calcStdDev(
  values: readonly number[],
  period: number,
  mean: number,
): number {
  if (values.length < period || period <= 0) return 0;
  const start = values.length - period;
  let sumSq = 0;
  for (let i = start; i < values.length; i++) {
    if (!isValid(values[i])) return 0;
    sumSq += (values[i] - mean) ** 2;
  }
  return Math.sqrt(sumSq / period);
}

export function highest(values: readonly number[], period: number): number {
  if (values.length === 0 || period <= 0) return 0;
  const start = Math.max(0, values.length - period);
  let max = -Infinity;
  for (let i = start; i < values.length; i++) {
    if (!isValid(values[i])) continue;
    if (values[i] > max) max = values[i];
  }
  return max === -Infinity ? 0 : max;
}

export function lowest(values: readonly number[], period: number): number {
  if (values.length === 0 || period <= 0) return 0;
  const start = Math.max(0, values.length - period);
  let min = Infinity;
  for (let i = start; i < values.length; i++) {
    if (!isValid(values[i])) continue;
    if (values[i] < min) min = values[i];
  }
  return min === Infinity ? 0 : min;
}

export function diff(values: readonly number[]): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  for (let i = 1; i < values.length; i++) {
    if (isValid(values[i]) && isValid(values[i - 1])) {
      result[i] = values[i] - values[i - 1];
    }
  }
  return result;
}

export function abs(values: readonly number[]): number[] {
  return values.map((v) => (isValid(v) ? Math.abs(v) : NaN));
}

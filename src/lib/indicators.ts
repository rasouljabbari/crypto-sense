import { TechnicalIndicators } from "./types";

export function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const c of recent) {
    if (c > 0) avgGain += c;
    else avgLoss -= c;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

function calcSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += prices[i - j];
    result.push(sum / period);
  }
  return result;
}

function calcEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (prices[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  return result;
}

function calcMACD(prices: number[]): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
} {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(ema12[i] - ema26[i]);
    }
  }
  const signalLine = calcEMA(macdLine.filter((v) => !isNaN(v)), 9);
  const histogram: number[] = [];
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - (signalLine[signalIdx] ?? 0));
      signalIdx++;
    }
  }
  return { macdLine, signalLine, histogram };
}

function calcBollingerBands(
  prices: number[],
  period = 20,
  stdDev = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calcSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(middle[i])) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let sumSq = 0;
    for (let j = 0; j < period; j++) sumSq += (prices[i - j] - middle[i]) ** 2;
    const std = Math.sqrt(sumSq / period);
    upper.push(middle[i] + stdDev * std);
    lower.push(middle[i] - stdDev * std);
  }
  return { upper, middle, lower };
}

function calcADX(prices: number[], period = 14): number {
  if (prices.length < period * 2) return 20;
  // Simplified ADX using directional price movement
  const tr: number[] = [];
  const upMove: number[] = [];
  const downMove: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const move = prices[i] - prices[i - 1];
    upMove.push(Math.max(move, 0));
    downMove.push(Math.max(-move, 0));
    tr.push(Math.abs(move));
  }
  const periodTR = tr.slice(-period).reduce((a, b) => a + b, 0) / period;
  const periodUp = upMove.slice(-period).reduce((a, b) => a + b, 0) / period;
  const periodDown = downMove.slice(-period).reduce((a, b) => a + b, 0) / period;
  if (periodTR === 0) return 20;
  const diPlus = (periodUp / periodTR) * 100;
  const diMinus = (periodDown / periodTR) * 100;
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  return Math.round(Math.min(100, Math.max(0, isNaN(dx) ? 20 : dx)));
}

export function estimatePosition(changePercent: number): {
  position: "long" | "short" | "neutral";
  score: number;
} {
  if (changePercent > 5) return { position: "long", score: Math.min(100, 60 + changePercent * 2) };
  if (changePercent > 2) return { position: "long", score: 55 + changePercent * 2.5 };
  if (changePercent < -5) return { position: "short", score: Math.max(0, 60 + Math.abs(changePercent) * 2) };
  if (changePercent < -2) return { position: "short", score: 55 + Math.abs(changePercent) * 2.5 };
  if (changePercent > 0.5) return { position: "neutral", score: 55 };
  if (changePercent < -0.5) return { position: "neutral", score: 45 };
  return { position: "neutral", score: 50 };
}

export function calculateTechnicalIndicatorsFromKlines(
  closes: number[],
  currentPrice: number,
): TechnicalIndicators {
  const rsi = calcRSI(closes, 14);
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, 50);
  const ema200Arr = calcEMA(closes, 200);
  const bb = calcBollingerBands(closes, 20, 2);
  const macd = calcMACD(closes);

  const last = (arr: number[]) => arr.filter((v) => !isNaN(v)).pop() ?? 0;

  // ADX: simplified calculation using directional movement
  const adx = calcADX(closes, 14);

  return {
    rsi,
    macd: {
      value: last(macd.macdLine),
      signal: last(macd.signalLine),
      histogram: last(macd.histogram),
    },
    ema9: last(ema9Arr),
    ema20: last(ema20Arr),
    ema21: last(ema21Arr),
    ema50: last(ema50Arr),
    ema200: last(ema200Arr),
    bollingerBands: {
      upper: last(bb.upper),
      middle: last(bb.middle),
      lower: last(bb.lower),
    },
    supportLevels: [],
    resistanceLevels: [],
    adx,
    atr: currentPrice * 0.02,
  };
}

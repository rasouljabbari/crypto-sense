import type { MarketAnalysisResult, ScoreEngineOutput, ScoreEngineSignal, ScoreEngineWeights } from "./types";
import {
  DEFAULT_WEIGHTS,
  BASE_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  SIGNAL_STRONG_BUY_MIN,
  SIGNAL_BUY_MIN,
  SIGNAL_NEUTRAL_MIN,
  SIGNAL_SELL_MIN,
} from "./constants";

function clamp(value: number): number {
  if (!Number.isFinite(value)) return BASE_SCORE;
  return Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, value)));
}

function calcTrendScore(input: MarketAnalysisResult): number {
  const ind = input.indicators;
  let raw = 0;

  const ema20gt50 = ind.ema20.value > ind.ema50.value;
  const ema50gt200 = ind.ema50.value > ind.ema200.value;
  const priceGtEma20 = input.currentPrice > ind.ema20.value;
  const priceGtEma50 = input.currentPrice > ind.ema50.value;

  if (ema20gt50) raw += 10;
  if (ema50gt200) raw += 10;
  if (priceGtEma20) raw += 8;
  if (priceGtEma50) raw += 7;

  if (ind.trendDirection.direction === "bullish") raw += 10;
  else if (ind.trendDirection.direction === "bearish") raw -= 10;

  if (ind.trendStrength.label === "strong") raw += 5;
  else if (ind.trendStrength.label === "weak") raw -= 5;

  const nearestResistance = ind.resistance.levels.length > 0
    ? Math.min(...ind.resistance.levels) : null;
  const nearestSupport = ind.support.levels.length > 0
    ? Math.max(...ind.support.levels) : null;

  if (nearestResistance !== null && input.currentPrice > nearestResistance) raw += 5;
  if (nearestSupport !== null && input.currentPrice < nearestSupport) raw -= 10;

  return clamp(BASE_SCORE + raw);
}

function calcMomentumScore(input: MarketAnalysisResult): number {
  const ind = input.indicators;
  let raw = 0;

  if (ind.macd.bullish) raw += 15;
  else raw -= 15;

  if (ind.rsi.value <= 30) raw += 15;
  else if (ind.rsi.value <= 45) raw += 8;
  else if (ind.rsi.value >= 70) raw -= 15;
  else if (ind.rsi.value >= 55) raw -= 8;

  if (ind.adx.adx >= 50) raw += 8;
  else if (ind.adx.adx >= 25) raw += 3;
  else raw -= 5;

  return clamp(BASE_SCORE + raw);
}

function calcVolumeScore(input: MarketAnalysisResult): number {
  const ind = input.indicators;
  let raw = 0;

  if (ind.obv.trend === "rising") raw += 15;
  else if (ind.obv.trend === "falling") raw -= 15;

  if (input.currentPrice > ind.vwap.value) raw += 10;
  else raw -= 10;

  return clamp(BASE_SCORE + raw);
}

function calcVolatilityScore(input: MarketAnalysisResult): number {
  const ind = input.indicators;
  let raw = 0;

  if (ind.volatility.label === "low") raw += 15;
  else if (ind.volatility.label === "medium") raw += 5;
  else if (ind.volatility.label === "high") raw -= 10;
  else if (ind.volatility.label === "extreme") raw -= 20;

  return clamp(BASE_SCORE + raw);
}

function calcRiskScore(input: MarketAnalysisResult): number {
  const ind = input.indicators;
  let raw = 0;

  const atrPct = input.currentPrice > 0 ? ind.atr.value / input.currentPrice : 0;
  if (atrPct < 0.01) raw += 15;
  else if (atrPct < 0.02) raw += 8;
  else if (atrPct < 0.03) raw += 0;
  else if (atrPct < 0.05) raw -= 10;
  else raw -= 20;

  if (ind.adx.trend === "strong") raw += 10;
  else if (ind.adx.trend === "trending") raw += 5;
  else raw -= 5;

  const allLevels = [...ind.support.levels, ...ind.resistance.levels];
  if (allLevels.length > 0 && input.currentPrice > 0) {
    let closestDist = Infinity;
    for (const level of allLevels) {
      const dist = Math.abs(level - input.currentPrice) / input.currentPrice;
      if (dist < closestDist) closestDist = dist;
    }
    if (closestDist >= 0.05) raw += 10;
    else if (closestDist >= 0.02) raw += 5;
    else raw -= 10;
  }

  return clamp(BASE_SCORE + raw);
}

function calcOverall(
  scores: { trend: number; momentum: number; volume: number; volatility: number; risk: number },
  weights: ScoreEngineWeights,
): number {
  const weighted =
    scores.trend * weights.trend +
    scores.momentum * weights.momentum +
    scores.volume * weights.volume +
    scores.volatility * weights.volatility +
    scores.risk * weights.risk;
  return clamp(weighted);
}

function calcConfidence(scores: { trend: number; momentum: number; volume: number; volatility: number; risk: number }): number {
  const allScores = [scores.trend, scores.momentum, scores.volume, scores.volatility, scores.risk];
  const deviations = allScores.map((s) => Math.abs(s - BASE_SCORE));
  const meanDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const raw = Math.round(Math.max(0, 100 - meanDev * 2));
  return clamp(raw);
}

function generateSignal(overallScore: number): ScoreEngineSignal {
  if (overallScore >= SIGNAL_STRONG_BUY_MIN) return "strong_buy";
  if (overallScore >= SIGNAL_BUY_MIN) return "buy";
  if (overallScore >= SIGNAL_NEUTRAL_MIN) return "neutral";
  if (overallScore >= SIGNAL_SELL_MIN) return "sell";
  return "strong_sell";
}

export function computeScores(
  input: MarketAnalysisResult,
  weights: ScoreEngineWeights = DEFAULT_WEIGHTS,
): ScoreEngineOutput {
  const trend = calcTrendScore(input);
  const momentum = calcMomentumScore(input);
  const volume = calcVolumeScore(input);
  const volatility = calcVolatilityScore(input);
  const risk = calcRiskScore(input);

  const overall = calcOverall({ trend, momentum, volume, volatility, risk }, weights);
  const confidence = calcConfidence({ trend, momentum, volume, volatility, risk });
  const signal = generateSignal(overall);

  return {
    scores: { trend, momentum, volume, volatility, risk },
    overall,
    confidence,
    signal,
    weights,
  };
}

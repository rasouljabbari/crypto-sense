import type { ScoreEngineInput, ScoreEngineOutput, ScoreBreakdownItem, ScoreLabel, FactorDetail } from "./types";

import {
  BASE_SCORE, MIN_SCORE, MAX_SCORE,
  TECHNICAL_RSI_OVERSOLD, TECHNICAL_RSI_NEUTRAL_LOW, TECHNICAL_RSI_NEUTRAL_HIGH, TECHNICAL_RSI_OVERBOUGHT,
  TECHNICAL_RSI_OVERSOLD_BONUS, TECHNICAL_RSI_LOW_BONUS, TECHNICAL_RSI_HIGH_PENALTY,
  TREND_EMA20_50_BONUS, TREND_EMA50_200_BONUS, TREND_ABOVE_RESISTANCE_BONUS, TREND_BELOW_SUPPORT_PENALTY,
  MOMENTUM_MACD_BULLISH_BONUS, MOMENTUM_ADX_THRESHOLD, MOMENTUM_ADX_BONUS,
  VOLUME_OBV_RISING_BONUS, VOLUME_VWAP_ABOVE_BONUS,
  VOLATILITY_HIGH_PENALTY, VOLATILITY_HIGH_LABELS,
  OVERALL_TECHNICAL_WEIGHT, OVERALL_TREND_WEIGHT, OVERALL_MOMENTUM_WEIGHT, OVERALL_VOLUME_WEIGHT, OVERALL_VOLATILITY_WEIGHT,
} from "./constants";

function clamp(value: number, min: number = MIN_SCORE, max: number = MAX_SCORE): number {
  if (!Number.isFinite(value)) return BASE_SCORE;
  return Math.round(Math.max(min, Math.min(max, value)));
}

function scoreLabel(value: number): ScoreLabel {
  if (value >= 80) return "very_bullish";
  if (value >= 60) return "bullish";
  if (value >= 40) return "neutral";
  if (value >= 20) return "bearish";
  return "very_bearish";
}

function detail(value: number, factors: readonly FactorDetail[]): ScoreBreakdownItem {
  return { value, label: scoreLabel(value), factors };
}

function factor(name: string, raw: number): FactorDetail {
  return { name, raw };
}

function calcTechnicalScore(rsi: ScoreEngineInput["rsi"]): { score: number; factors: FactorDetail[] } {
  let raw = 0;
  if (rsi.value <= TECHNICAL_RSI_OVERSOLD) {
    raw = TECHNICAL_RSI_OVERSOLD_BONUS;
  } else if (rsi.value <= TECHNICAL_RSI_NEUTRAL_LOW) {
    raw = TECHNICAL_RSI_LOW_BONUS;
  } else if (rsi.value > TECHNICAL_RSI_OVERBOUGHT) {
    raw = TECHNICAL_RSI_HIGH_PENALTY;
  }
  return { score: clamp(BASE_SCORE + raw), factors: [factor("RSI", raw)] };
}

function calcTrendScore(
  input: Pick<ScoreEngineInput, "ema20" | "ema50" | "ema200" | "currentPrice" | "resistance" | "support">,
): { score: number; factors: FactorDetail[] } {
  const factorsList: FactorDetail[] = [];
  let raw = 0;

  const ema20gt50 = input.ema20.value > input.ema50.value;
  const ema50gt200 = input.ema50.value > input.ema200.value;

  if (ema20gt50) {
    raw += TREND_EMA20_50_BONUS;
    factorsList.push(factor("EMA20_50", TREND_EMA20_50_BONUS));
  } else {
    factorsList.push(factor("EMA20_50", 0));
  }

  if (ema50gt200) {
    raw += TREND_EMA50_200_BONUS;
    factorsList.push(factor("EMA50_200", TREND_EMA50_200_BONUS));
  } else {
    factorsList.push(factor("EMA50_200", 0));
  }

  const nearestResistance = input.resistance.levels.length > 0
    ? Math.min(...input.resistance.levels)
    : null;
  const nearestSupport = input.support.levels.length > 0
    ? Math.max(...input.support.levels)
    : null;

  if (nearestResistance !== null && input.currentPrice > nearestResistance) {
    raw += TREND_ABOVE_RESISTANCE_BONUS;
    factorsList.push(factor("Above_Resistance", TREND_ABOVE_RESISTANCE_BONUS));
  } else {
    factorsList.push(factor("Above_Resistance", 0));
  }

  if (nearestSupport !== null && input.currentPrice < nearestSupport) {
    raw += TREND_BELOW_SUPPORT_PENALTY;
    factorsList.push(factor("Below_Support", TREND_BELOW_SUPPORT_PENALTY));
  } else {
    factorsList.push(factor("Below_Support", 0));
  }

  return { score: clamp(BASE_SCORE + raw), factors: factorsList };
}

function calcMomentumScore(
  input: Pick<ScoreEngineInput, "macd" | "adx">,
): { score: number; factors: FactorDetail[] } {
  const factorsList: FactorDetail[] = [];
  let raw = 0;

  if (input.macd.bullish) {
    raw += MOMENTUM_MACD_BULLISH_BONUS;
    factorsList.push(factor("MACD_Bullish", MOMENTUM_MACD_BULLISH_BONUS));
  } else {
    factorsList.push(factor("MACD_Bullish", 0));
  }

  if (input.adx.adx > MOMENTUM_ADX_THRESHOLD) {
    raw += MOMENTUM_ADX_BONUS;
    factorsList.push(factor("ADX", MOMENTUM_ADX_BONUS));
  } else {
    factorsList.push(factor("ADX", 0));
  }

  return { score: clamp(BASE_SCORE + raw), factors: factorsList };
}

function calcVolumeScore(
  input: Pick<ScoreEngineInput, "obv" | "vwap" | "currentPrice">,
): { score: number; factors: FactorDetail[] } {
  const factorsList: FactorDetail[] = [];
  let raw = 0;

  if (input.obv.trend === "rising") {
    raw += VOLUME_OBV_RISING_BONUS;
    factorsList.push(factor("OBV_Rising", VOLUME_OBV_RISING_BONUS));
  } else {
    factorsList.push(factor("OBV_Rising", 0));
  }

  if (input.currentPrice > input.vwap.value) {
    raw += VOLUME_VWAP_ABOVE_BONUS;
    factorsList.push(factor("Price_Above_VWAP", VOLUME_VWAP_ABOVE_BONUS));
  } else {
    factorsList.push(factor("Price_Above_VWAP", 0));
  }

  return { score: clamp(BASE_SCORE + raw), factors: factorsList };
}

function calcVolatilityScore(
  input: Pick<ScoreEngineInput, "volatility">,
): { score: number; factors: FactorDetail[] } {
  let raw = 0;

  if (VOLATILITY_HIGH_LABELS.includes(input.volatility.label)) {
    raw = VOLATILITY_HIGH_PENALTY;
  }

  return { score: clamp(BASE_SCORE + raw), factors: [factor("Volatility", raw)] };
}

function calcOverall(scores: {
  technical: number;
  trend: number;
  momentum: number;
  volume: number;
  volatilityScore: number;
}): { score: number; factors: FactorDetail[] } {
  const factorsList: FactorDetail[] = [
    factor("Technical", scores.technical),
    factor("Trend", scores.trend),
    factor("Momentum", scores.momentum),
    factor("Volume", scores.volume),
    factor("Volatility", scores.volatilityScore),
  ];

  const weighted =
    scores.technical * OVERALL_TECHNICAL_WEIGHT +
    scores.trend * OVERALL_TREND_WEIGHT +
    scores.momentum * OVERALL_MOMENTUM_WEIGHT +
    scores.volume * OVERALL_VOLUME_WEIGHT +
    scores.volatilityScore * OVERALL_VOLATILITY_WEIGHT;

  return { score: clamp(weighted), factors: factorsList };
}

function calcConfidence(scores: {
  technical: number;
  trend: number;
  momentum: number;
  volume: number;
  volatilityScore: number;
}): { score: number; factors: FactorDetail[] } {
  const allScores = [
    scores.technical,
    scores.trend,
    scores.momentum,
    scores.volume,
    scores.volatilityScore,
  ];

  const deviations = allScores.map((s) => Math.abs(s - BASE_SCORE));
  const meanDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const raw = Math.round(Math.max(0, 100 - meanDev * 2));

  return {
    score: clamp(raw),
    factors: [factor("Score_Agreement", raw)],
  };
}

export function calculateScores(input: ScoreEngineInput): ScoreEngineOutput {
  const tech = calcTechnicalScore(input.rsi);
  const trend = calcTrendScore(input);
  const mom = calcMomentumScore(input);
  const vol = calcVolumeScore(input);
  const vola = calcVolatilityScore(input);

  const overall = calcOverall({
    technical: tech.score,
    trend: trend.score,
    momentum: mom.score,
    volume: vol.score,
    volatilityScore: vola.score,
  });

  const conf = calcConfidence({
    technical: tech.score,
    trend: trend.score,
    momentum: mom.score,
    volume: vol.score,
    volatilityScore: vola.score,
  });

  return {
    technical: tech.score,
    trend: trend.score,
    momentum: mom.score,
    volume: vol.score,
    volatilityScore: vola.score,
    overall: overall.score,
    confidence: conf.score,
    breakdown: {
      technical: detail(tech.score, tech.factors),
      trend: detail(trend.score, trend.factors),
      momentum: detail(mom.score, mom.factors),
      volume: detail(vol.score, vol.factors),
      volatilityScore: detail(vola.score, vola.factors),
      overall: detail(overall.score, overall.factors),
      confidence: detail(conf.score, conf.factors),
    },
  };
}

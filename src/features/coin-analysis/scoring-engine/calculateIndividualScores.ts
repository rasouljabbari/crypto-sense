// ---------------------------------------------------------------------------
// Coin Analysis — Individual Score Calculation
// ---------------------------------------------------------------------------
// Computes Trend, Momentum, Volume, Volatility, and Risk scores (0-100) with reasons.
// ---------------------------------------------------------------------------

import type {
  IndividualScore,
  IndividualScores,
  TechnicalAnalysis,
  TrendDirection,
  SignalStrength,
} from "@/features/analysis-engine/types";

// ─── Constants ─────────────────────────────────────────────────────────────

const BASE_SCORE = 50;
const MAX_SCORE = 100;
const MIN_SCORE = 0;

// ─── Trend Score ───────────────────────────────────────────────────────────

export const calculateTrendScore = (
  ta: TechnicalAnalysis,
): IndividualScore => {
  const { ema, adx, trend, strength } = ta;
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // EMA Alignment
  const ema20 = ema.find((e) => e.period === 20)?.value;
  const ema50 = ema.find((e) => e.period === 50)?.value;
  const ema200 = ema.find((e) => e.period === 200)?.value;

  if (ema20 && ema50 && ema20 > ema50) {
    score += 15;
    reasons.push("EMA 20 > EMA 50");
  } else if (ema20 && ema50 && ema20 < ema50) {
    score -= 15;
    reasons.push("EMA 20 < EMA 50");
  }

  if (ema50 && ema200 && ema50 > ema200) {
    score += 10;
    reasons.push("EMA 50 > EMA 200");
  } else if (ema50 && ema200 && ema50 < ema200) {
    score -= 10;
    reasons.push("EMA 50 < EMA 200");
  }

  // ADX Strength
  if (adx.adx >= 50) {
    score += 20;
    reasons.push("ADX > 50 (Strong Trend)");
  } else if (adx.adx >= 25) {
    score += 10;
    reasons.push("ADX > 25 (Trending)");
  } else if (adx.adx < 20) {
    score -= 10;
    reasons.push("ADX < 20 (Weak Trend)");
  }

  // Trend Direction
  if (trend === "bullish") {
    score += 5;
    reasons.push("Bullish Trend");
  } else if (trend === "bearish") {
    score -= 5;
    reasons.push("Bearish Trend");
  }

  // Clamp and Title
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const title = getTrendTitle(score, strength);

  return { value: score, title, reasons };
};

const getTrendTitle = (score: number, strength: SignalStrength): string => {
  if (score >= 80) return "Strong Bullish Trend";
  if (score >= 60) return "Bullish Trend";
  if (score >= 40) return "Neutral Trend";
  if (score >= 20) return "Bearish Trend";
  return "Strong Bearish Trend";
};

// ─── Momentum Score ────────────────────────────────────────────────────────

export const calculateMomentumScore = (
  ta: TechnicalAnalysis,
): IndividualScore => {
  const { rsi, macd, stochasticRsi } = ta;
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // RSI
  if (rsi.oversold) {
    score += 20;
    reasons.push("RSI Oversold (Bullish)");
  } else if (rsi.overbought) {
    score -= 15;
    reasons.push("RSI Overbought (Bearish)");
  }

  // MACD
  if (macd.bullish) {
    score += 15;
    reasons.push("MACD Bullish Cross");
  } else if (macd.histogram < 0) {
    score -= 10;
    reasons.push("MACD Bearish");
  }

  // Stochastic RSI
  if (stochasticRsi?.oversold) {
    score += 10;
    reasons.push("Stochastic RSI Oversold");
  } else if (stochasticRsi?.overbought) {
    score -= 10;
    reasons.push("Stochastic RSI Overbought");
  }

  // Clamp and Title
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const title = getMomentumTitle(score);

  return { value: score, title, reasons };
};

const getMomentumTitle = (score: number): string => {
  if (score >= 80) return "Strong Bullish Momentum";
  if (score >= 60) return "Bullish Momentum";
  if (score >= 40) return "Neutral Momentum";
  if (score >= 20) return "Bearish Momentum";
  return "Strong Bearish Momentum";
};

// ─── Volume Score ───────────────────────────────────────────────────────────

export const calculateVolumeScore = (
  ta: TechnicalAnalysis,
): IndividualScore => {
  const { volumeProfile, obv } = ta;
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // Volume Profile
  if (volumeProfile.volumeSpike) {
    score += 15;
    reasons.push(`Volume Spike (${volumeProfile.spikeRatio.toFixed(1)}x)`);
  }

  if (volumeProfile.totalVolume > volumeProfile.averageVolume * 1.5) {
    score += 10;
    reasons.push("Volume > 1.5x Average");
  } else if (volumeProfile.totalVolume < volumeProfile.averageVolume * 0.5) {
    score -= 10;
    reasons.push("Volume < 0.5x Average");
  }

  // OBV
  if (obv.trend === "rising") {
    score += 15;
    reasons.push("OBV Rising");
  } else if (obv.trend === "falling") {
    score -= 15;
    reasons.push("OBV Falling");
  }

  // Clamp and Title
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const title = getVolumeTitle(score);

  return { value: score, title, reasons };
};

const getVolumeTitle = (score: number): string => {
  if (score >= 80) return "Very High Volume";
  if (score >= 60) return "High Volume";
  if (score >= 40) return "Normal Volume";
  if (score >= 20) return "Low Volume";
  return "Very Low Volume";
};

// ─── Volatility Score ───────────────────────────────────────────────────────

export const calculateVolatilityScore = (
  ta: TechnicalAnalysis,
): IndividualScore => {
  const { atr, bollingerBands } = ta;
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // ATR
  if (atr.value > 2.0) {
    score -= 15;
    reasons.push("High ATR (Volatile)");
  } else if (atr.value < 0.5) {
    score -= 5;
    reasons.push("Low ATR (Low Volatility)");
  }

  // Bollinger Bands
  if (bollingerBands.pricePosition === "above") {
    score -= 10;
    reasons.push("Price Above Upper Band");
  } else if (bollingerBands.pricePosition === "below") {
    score += 10;
    reasons.push("Price Below Lower Band");
  }

  // Clamp and Title
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const title = getVolatilityTitle(score);

  return { value: score, title, reasons };
};

const getVolatilityTitle = (score: number): string => {
  if (score >= 80) return "Extreme Volatility";
  if (score >= 60) return "High Volatility";
  if (score >= 40) return "Moderate Volatility";
  if (score >= 20) return "Low Volatility";
  return "Very Low Volatility";
};

// ─── Risk Score ─────────────────────────────────────────────────────────────

export const calculateRiskScore = (
  ta: TechnicalAnalysis,
): IndividualScore => {
  const { atr, supportResistance } = ta;
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // ATR Risk
  if (atr.value > 2.0) {
    score -= 20;
    reasons.push("High ATR (High Risk)");
  } else if (atr.value < 0.5) {
    score += 5;
    reasons.push("Low ATR (Low Risk)");
  }

  // Support/Resistance
  if (supportResistance.supportLevels.length === 0) {
    score -= 15;
    reasons.push("No Support Levels");
  }

  if (supportResistance.resistanceLevels.length === 0) {
    score -= 15;
    reasons.push("No Resistance Levels");
  }

  // Clamp and Title
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const title = getRiskTitle(score);

  return { value: score, title, reasons };
};

const getRiskTitle = (score: number): string => {
  if (score >= 80) return "Very Low Risk";
  if (score >= 60) return "Low Risk";
  if (score >= 40) return "Moderate Risk";
  if (score >= 20) return "High Risk";
  return "Very High Risk";
};

// ─── Aggregate ──────────────────────────────────────────────────────────────

export const calculateIndividualScores = (
  ta: TechnicalAnalysis,
): IndividualScores => ({
  trend: calculateTrendScore(ta),
  momentum: calculateMomentumScore(ta),
  volume: calculateVolumeScore(ta),
  volatility: calculateVolatilityScore(ta),
  risk: calculateRiskScore(ta),
});
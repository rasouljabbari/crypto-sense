import type { RiskInput, RiskResult, RiskLevel } from "./types";
import {
  BASE_SCORE,
  ATR_PCT_LOW, ATR_PCT_MODERATE, ATR_PCT_HIGH, ATR_PCT_EXTREME,
  ATR_LOW_BONUS, ATR_MODERATE_BONUS, ATR_HIGH_PENALTY, ATR_EXTREME_PENALTY,
  ADX_STRONG, ADX_TRENDING,
  ADX_STRONG_BONUS, ADX_TRENDING_BONUS, ADX_RANGING_PENALTY,
  VOL_LOW_BONUS, VOL_HIGH_PENALTY, VOL_EXTREME_PENALTY,
  SR_DISTANCE_SAFE, SR_DISTANCE_MODERATE,
  SR_SAFE_BONUS, SR_MODERATE_BONUS, SR_TIGHT_PENALTY,
  STOP_ATR_MULTIPLIER, STOP_SUPPORT_BUFFER,
  RISK_VERY_LOW_MIN, RISK_LOW_MIN, RISK_MEDIUM_MIN, RISK_HIGH_MIN,
} from "./constants";

function clamp(value: number, min: number = 0, max: number = 100): number {
  if (!Number.isFinite(value)) return BASE_SCORE;
  return Math.round(Math.max(min, Math.min(max, value)));
}

function calcAtrRisk(input: RiskInput): { score: number; atrPct: number } {
  if (input.currentPrice <= 0) return { score: 0, atrPct: 0 };
  const atrPct = input.atr.value / input.currentPrice;
  let raw = 0;
  if (atrPct < ATR_PCT_LOW) raw = ATR_LOW_BONUS;
  else if (atrPct < ATR_PCT_MODERATE) raw = ATR_MODERATE_BONUS;
  else if (atrPct < ATR_PCT_HIGH) raw = 0;
  else if (atrPct < ATR_PCT_EXTREME) raw = ATR_HIGH_PENALTY;
  else raw = ATR_EXTREME_PENALTY;
  return { score: raw, atrPct };
}

function calcAdxRisk(adx: RiskInput["adx"]): number {
  if (adx.adx >= ADX_STRONG) return ADX_STRONG_BONUS;
  if (adx.adx >= ADX_TRENDING) return ADX_TRENDING_BONUS;
  return ADX_RANGING_PENALTY;
}

function calcVolatilityRisk(vol: RiskInput["volatility"]): number {
  if (vol.label === "low") return VOL_LOW_BONUS;
  if (vol.label === "high") return VOL_HIGH_PENALTY;
  if (vol.label === "extreme") return VOL_EXTREME_PENALTY;
  return 0;
}

function calcSupportResistanceRisk(input: RiskInput): number {
  const allLevels = [
    ...input.support.levels,
    ...input.resistance.levels,
  ];
  if (allLevels.length === 0 || input.currentPrice <= 0) return 0;

  let closestDist = Infinity;
  for (const level of allLevels) {
    const dist = Math.abs(level - input.currentPrice) / input.currentPrice;
    if (dist < closestDist) closestDist = dist;
  }

  if (closestDist >= SR_DISTANCE_SAFE) return SR_SAFE_BONUS;
  if (closestDist >= SR_DISTANCE_MODERATE) return SR_MODERATE_BONUS;
  return SR_TIGHT_PENALTY;
}

function calcRiskLevel(score: number): RiskLevel {
  if (score >= RISK_VERY_LOW_MIN) return "very_low";
  if (score >= RISK_LOW_MIN) return "low";
  if (score >= RISK_MEDIUM_MIN) return "medium";
  if (score >= RISK_HIGH_MIN) return "high";
  return "extreme";
}

function calcSuggestedStopLoss(input: RiskInput): number {
  const atrStop = input.currentPrice - (input.atr.value * STOP_ATR_MULTIPLIER);

  const supportsBelow = input.support.levels
    .filter((l) => l < input.currentPrice)
    .sort((a, b) => b - a);

  if (supportsBelow.length === 0) return Math.max(0, atrStop);

  const nearestSupport = supportsBelow[0];
  const supportStop = nearestSupport * (1 - STOP_SUPPORT_BUFFER);

  return Math.max(atrStop, supportStop);
}

function calcRiskPercentage(riskScore: number): number {
  if (riskScore >= 80) return 2;
  if (riskScore >= 60) return 1.5;
  if (riskScore >= 40) return 1;
  if (riskScore >= 20) return 0.5;
  return 0.25;
}

export function calculateRisk(input: RiskInput): RiskResult {
  const atrResult = calcAtrRisk(input);
  const adxScore = calcAdxRisk(input.adx);
  const volScore = calcVolatilityRisk(input.volatility);
  const srScore = calcSupportResistanceRisk(input);

  const riskScore = clamp(BASE_SCORE + atrResult.score + adxScore + volScore + srScore);
  const riskLevel = calcRiskLevel(riskScore);
  const suggestedStopLoss = calcSuggestedStopLoss(input);
  const riskPercentage = calcRiskPercentage(riskScore);

  return { riskScore, riskLevel, suggestedStopLoss, riskPercentage };
}

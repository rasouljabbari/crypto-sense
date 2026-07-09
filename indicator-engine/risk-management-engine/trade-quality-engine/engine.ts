import type { TradeDirection, TradeSetupRawInput } from "../types";
import {
  TREND_STRONG_WEIGHT, TREND_MODERATE_WEIGHT, TREND_WEAK_WEIGHT,
  ADX_STRONG, ADX_TRENDING,
  ADX_STRONG_WEIGHT, ADX_TRENDING_WEIGHT, ADX_WEAK_WEIGHT,
  SCORE_HIGH, SCORE_GOOD, SCORE_MEDIUM,
  SCORE_HIGH_WEIGHT, SCORE_GOOD_WEIGHT, SCORE_MEDIUM_WEIGHT, SCORE_LOW_WEIGHT,
  SIGNAL_ALIGNED_WEIGHT, SIGNAL_NEUTRAL_WEIGHT,
  RISK_VERY_LOW_WEIGHT, RISK_LOW_WEIGHT, RISK_MEDIUM_WEIGHT, RISK_HIGH_WEIGHT, RISK_EXTREME_WEIGHT,
} from "../config";
import { clamp } from "../utils";

function trendWeight(label: string): number {
  if (label === "strong") return TREND_STRONG_WEIGHT;
  if (label === "moderate") return TREND_MODERATE_WEIGHT;
  return TREND_WEAK_WEIGHT;
}

function adxWeight(adx: number): number {
  if (adx >= ADX_STRONG) return ADX_STRONG_WEIGHT;
  if (adx >= ADX_TRENDING) return ADX_TRENDING_WEIGHT;
  return ADX_WEAK_WEIGHT;
}

function scoreWeight(score: number): number {
  if (score >= SCORE_HIGH) return SCORE_HIGH_WEIGHT;
  if (score >= SCORE_GOOD) return SCORE_GOOD_WEIGHT;
  if (score >= SCORE_MEDIUM) return SCORE_MEDIUM_WEIGHT;
  return SCORE_LOW_WEIGHT;
}

function signalWeight(
  signal: string,
  direction: TradeDirection,
): number {
  const bullish = signal === "strong_buy" || signal === "buy";
  const bearish = signal === "strong_sell" || signal === "sell";
  if ((direction === "long" && bullish) || (direction === "short" && bearish)) {
    return SIGNAL_ALIGNED_WEIGHT;
  }
  return SIGNAL_NEUTRAL_WEIGHT;
}

function riskWeight(level: string): number {
  if (level === "very_low") return RISK_VERY_LOW_WEIGHT;
  if (level === "low") return RISK_LOW_WEIGHT;
  if (level === "medium") return RISK_MEDIUM_WEIGHT;
  if (level === "high") return RISK_HIGH_WEIGHT;
  return RISK_EXTREME_WEIGHT;
}

export function calculateTradeQuality(
  direction: TradeDirection,
  input: TradeSetupRawInput,
): number {
  const total = clamp(
    trendWeight(input.trendStrength.label)
    + adxWeight(input.adx)
    + scoreWeight(input.overallScore)
    + signalWeight(input.signal, direction)
    + riskWeight(input.riskLevel),
    0,
    100,
  );
  return total;
}

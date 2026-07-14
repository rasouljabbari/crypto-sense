// ---------------------------------------------------------------------------
// Coin Analysis — Overall Score Calculation
// ---------------------------------------------------------------------------
// Combines individual scores using configurable weights.
// ---------------------------------------------------------------------------

import type {
  IndividualScores,
  OverallScore,
  TradingSignalType,
} from "@/features/analysis-engine/types";
import { SCORE_WEIGHTS, SIGNAL_MAP } from "@/indicator-engine/risk-management-engine/config";

// ─── Overall Score ───────────────────────────────────────────────────────────

export const calculateOverallScore = (
  scores: IndividualScores,
): OverallScore => {
  const { trend, momentum, volume, volatility, risk } = scores;
  const { trend: wTrend, momentum: wMomentum, volume: wVolume, volatility: wVolatility, risk: wRisk } = SCORE_WEIGHTS;

  const value =
    trend.value * wTrend +
    momentum.value * wMomentum +
    volume.value * wVolume +
    volatility.value * wVolatility +
    risk.value * wRisk;

  const signal = getSignalType(value);

  return {
    value,
    signal,
    weights: SCORE_WEIGHTS,
  };
};

// ─── Signal Mapping ────────────────────────────────────────────────────────

const getSignalType = (score: number): TradingSignalType => {
  for (const { min, signal } of SIGNAL_MAP) {
    if (score >= min) return signal as TradingSignalType;
  }
  return "Strong Sell" as TradingSignalType;
};
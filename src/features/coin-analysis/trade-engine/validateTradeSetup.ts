// ---------------------------------------------------------------------------
// Coin Analysis — Trade Setup Validation
// ---------------------------------------------------------------------------
// Validates trade pre-conditions (Overall Score, ADX, Support/Resistance, etc.).
// ---------------------------------------------------------------------------

import type {
  TechnicalAnalysis,
  TradeSetupResult,
} from "@/features/analysis-engine/types";
import {
  MIN_OVERALL_SCORE,
  MIN_ADX,
  MIN_SR_LEVELS,
  MIN_RISK_REWARD,
} from "@/indicator-engine/risk-management-engine/config";

// ─── Validation Rules ───────────────────────────────────────────────────────

export const validateTradeSetup = (
  overallScore: number,
  ta: TechnicalAnalysis,
): TradeSetupResult => {
  const { adx, supportResistance, trend } = ta;
  const failedRules: string[] = [];

  // Overall Score
  if (overallScore < MIN_OVERALL_SCORE) {
    failedRules.push(`Overall Score ${overallScore} < ${MIN_OVERALL_SCORE}`);
  }

  // ADX
  if (adx.adx < MIN_ADX) {
    failedRules.push(`ADX ${adx.adx} < ${MIN_ADX}`);
  }

  // Trend
  if (trend === "neutral") {
    failedRules.push("Trend is neutral");
  }

  // Support/Resistance
  if (supportResistance.supportLevels.length < MIN_SR_LEVELS) {
    failedRules.push("No support levels");
  }

  if (supportResistance.resistanceLevels.length < MIN_SR_LEVELS) {
    failedRules.push("No resistance levels");
  }

  // Result
  if (failedRules.length > 0) {
    return {
      hasTrade: false,
      reason: `Invalid trade: ${failedRules.join(", ")}.`,
    };
  }

  return { hasTrade: true };
};
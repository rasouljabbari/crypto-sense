import type { TradeDirection, TradeSetupRawInput, ValidationResult } from "../types";
import { MIN_TRADE_QUALITY, MIN_RISK_REWARD } from "../config";

export function validateSetup(
  direction: TradeDirection,
  entry: number,
  stopLoss: number,
  risk: number,
  tp1: number,
  tradeQuality: number,
  input: TradeSetupRawInput,
): ValidationResult {
  const reasons: string[] = [];

  if (entry <= 0) {
    reasons.push("Entry is invalid");
  }

  if (stopLoss <= 0) {
    reasons.push("Stop loss is invalid");
  }

  if (risk <= 0) {
    reasons.push("Risk must be greater than zero");
  }

  if (direction === "long" && entry <= stopLoss) {
    reasons.push("Entry must be above stop loss for long trade");
  }

  if (direction === "short" && entry >= stopLoss) {
    reasons.push("Entry must be below stop loss for short trade");
  }

  if (input.trendDirection === "neutral") {
    reasons.push("Trend is unclear");
  }

  const rr1 = risk > 0 ? Math.round((Math.abs(tp1 - entry) / risk) * 100) / 100 : 0;
  if (rr1 < MIN_RISK_REWARD) {
    reasons.push(`Risk reward for TP1 (${rr1.toFixed(1)}) is below minimum (${MIN_RISK_REWARD})`);
  }

  if (tradeQuality < MIN_TRADE_QUALITY) {
    reasons.push(`Trade quality (${tradeQuality}) is below minimum (${MIN_TRADE_QUALITY})`);
  }

  if (input.supportLevels.length === 0 && input.resistanceLevels.length === 0) {
    reasons.push("Support and resistance are unreliable");
  }

  if (reasons.length > 0) {
    return { isValid: false, reason: reasons.join("; ") };
  }

  return { isValid: true, reason: null };
}

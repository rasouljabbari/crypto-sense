import type { TradeDirection, TradeSetupRawInput, ValidationResult } from "../types";
import {
  MIN_OVERALL_SCORE, MIN_ADX, MIN_ATR, MIN_SR_LEVELS,
  MIN_TRADE_QUALITY, MIN_RISK_REWARD,
} from "../config";

export function validatePreConditions(input: TradeSetupRawInput): ValidationResult {
  const reasons: string[] = [];

  if (input.overallScore < MIN_OVERALL_SCORE) {
    reasons.push(`Overall score (${input.overallScore}) is below minimum (${MIN_OVERALL_SCORE})`);
  }

  if (input.trendDirection === "neutral") {
    reasons.push("Trend is neutral; no clear direction");
  }

  if (input.adx < MIN_ADX) {
    reasons.push(`ADX (${input.adx.toFixed(1)}) is below minimum (${MIN_ADX}) — trend too weak`);
  }

  if (!(input.atr > MIN_ATR)) {
    reasons.push("ATR is invalid or zero — cannot calculate stop loss");
  }

  const srCount = input.supportLevels.length + input.resistanceLevels.length;
  if (srCount < MIN_SR_LEVELS) {
    reasons.push("No support or resistance levels detected");
  }

  if (reasons.length > 0) {
    return { isValid: false, reason: reasons.join("; ") };
  }

  return { isValid: true, reason: null };
}

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
    reasons.push("Entry price is invalid");
  }

  if (stopLoss <= 0) {
    reasons.push("Stop loss price is invalid");
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

  const srCount = input.supportLevels.length + input.resistanceLevels.length;
  if (srCount < MIN_SR_LEVELS) {
    reasons.push("Support and resistance levels are required");
  }

  const rr1 = risk > 0 ? Math.round((Math.abs(tp1 - entry) / risk) * 100) / 100 : 0;
  if (rr1 < MIN_RISK_REWARD) {
    reasons.push(`Risk/reward for TP1 (${rr1.toFixed(1)}R) is below minimum (${MIN_RISK_REWARD}R)`);
  }

  if (tradeQuality < MIN_TRADE_QUALITY) {
    reasons.push(`Trade quality (${tradeQuality}) is below minimum (${MIN_TRADE_QUALITY})`);
  }

  if (reasons.length > 0) {
    return { isValid: false, reason: reasons.join("; ") };
  }

  return { isValid: true, reason: null };
}

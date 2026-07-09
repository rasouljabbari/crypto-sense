import type { TradeSetupInput, TradeSetupOutput, TradeDirection, TakeProfitLevels } from "./types";
import {
  ENTRY_ATR_MULTIPLIER,
  ENTRY_ATR_VOLATILITY_BUMP,
  STOP_ATR_MULTIPLIER,
  STOP_SUPPORT_BUFFER,
  STOP_RESISTANCE_BUFFER,
  TP_RISK_MULTIPLIER_1,
  TP_RISK_MULTIPLIER_2,
  TP_RISK_MULTIPLIER_3,
  DEFAULT_RISK_PERCENT,
  VOLATILITY_RISK_MAP,
  TREND_ALIGNED_BONUS,
  TREND_NEUTRAL_PENALTY,
  TREND_MISALIGNED_PENALTY,
  VOLATILITY_LOW_BONUS,
  VOLATILITY_MEDIUM_BONUS,
  VOLATILITY_HIGH_PENALTY,
  VOLATILITY_EXTREME_PENALTY,
  SIGNAL_STRONG_BONUS,
  SIGNAL_NORMAL_BONUS,
  SIGNAL_NEUTRAL_ZERO,
  SR_CLOSE_QUALITY,
  SR_MODERATE_QUALITY,
  SR_FAR_QUALITY,
  SR_NONE_PENALTY,
  SR_CLOSE_THRESHOLD,
  SR_MODERATE_THRESHOLD,
  MIN_TRADE_QUALITY,
} from "./constants";
import { roundTo, clamp } from "./utils";

function determineDirection(signal: string): TradeDirection | null {
  if (signal === "strong_buy" || signal === "buy") return "long";
  if (signal === "strong_sell" || signal === "sell") return "short";
  return null;
}

function nearestBelow(levels: readonly number[], price: number): number | null {
  const below = levels.filter((l) => l < price).sort((a, b) => b - a);
  return below.length > 0 ? below[0] : null;
}

function nearestAbove(levels: readonly number[], price: number): number | null {
  const above = levels.filter((l) => l > price).sort((a, b) => a - b);
  return above.length > 0 ? above[0] : null;
}

function calcEntry(
  direction: TradeDirection,
  input: TradeSetupInput,
): number {
  const baseBuffer = input.atr * ENTRY_ATR_MULTIPLIER;
  const volBuffer = input.volatility === "high" || input.volatility === "extreme"
    ? input.atr * ENTRY_ATR_VOLATILITY_BUMP
    : 0;
  const buffer = baseBuffer + volBuffer;

  if (direction === "long") {
    const support = nearestBelow(input.supportLevels, input.currentPrice);
    if (support !== null) {
      return roundTo(Math.max(input.currentPrice, support + buffer), 2);
    }
    return roundTo(input.currentPrice, 2);
  }

  const resistance = nearestAbove(input.resistanceLevels, input.currentPrice);
  if (resistance !== null) {
    return roundTo(Math.min(input.currentPrice, resistance - buffer), 2);
  }
  return roundTo(input.currentPrice, 2);
}

function calcStopLoss(
  direction: TradeDirection,
  entry: number,
  input: TradeSetupInput,
): number {
  const atrStop = input.atr * STOP_ATR_MULTIPLIER;

  if (direction === "long") {
    const atrBased = entry - atrStop;
    const support = nearestBelow(input.supportLevels, entry);
    if (support !== null) {
      const supportBased = support * (1 - STOP_SUPPORT_BUFFER);
      return roundTo(Math.max(atrBased, supportBased), 2);
    }
    return roundTo(Math.max(atrBased, 0), 2);
  }

  const atrBased = entry + atrStop;
  const resistance = nearestAbove(input.resistanceLevels, entry);
  if (resistance !== null) {
    const resistanceBased = resistance * (1 + STOP_RESISTANCE_BUFFER);
    return roundTo(Math.min(atrBased, resistanceBased), 2);
  }
  return roundTo(atrBased, 2);
}

function calcTakeProfit(
  direction: TradeDirection,
  entry: number,
  risk: number,
): TakeProfitLevels {
  if (risk <= 0) {
    return { tp1: entry, tp2: entry, tp3: entry };
  }

  if (direction === "long") {
    return {
      tp1: roundTo(entry + risk * TP_RISK_MULTIPLIER_1, 2),
      tp2: roundTo(entry + risk * TP_RISK_MULTIPLIER_2, 2),
      tp3: roundTo(entry + risk * TP_RISK_MULTIPLIER_3, 2),
    };
  }

  return {
    tp1: roundTo(entry - risk * TP_RISK_MULTIPLIER_1, 2),
    tp2: roundTo(entry - risk * TP_RISK_MULTIPLIER_2, 2),
    tp3: roundTo(entry - risk * TP_RISK_MULTIPLIER_3, 2),
  };
}

function calcRiskPercent(volatility: string): number {
  return VOLATILITY_RISK_MAP[volatility] ?? DEFAULT_RISK_PERCENT;
}

function calcTradeQuality(
  direction: TradeDirection,
  input: TradeSetupInput,
): number {
  let score = 50;

  if (direction === "long" && input.trend === "bullish") score += TREND_ALIGNED_BONUS;
  else if (direction === "short" && input.trend === "bearish") score += TREND_ALIGNED_BONUS;
  else if (input.trend === "neutral") score -= TREND_NEUTRAL_PENALTY;
  else score -= TREND_MISALIGNED_PENALTY;

  if (input.volatility === "low") score += VOLATILITY_LOW_BONUS;
  else if (input.volatility === "medium") score += VOLATILITY_MEDIUM_BONUS;
  else if (input.volatility === "high") score -= VOLATILITY_HIGH_PENALTY;
  else if (input.volatility === "extreme") score -= VOLATILITY_EXTREME_PENALTY;

  if (input.signal === "strong_buy" || input.signal === "strong_sell") score += SIGNAL_STRONG_BONUS;
  else if (input.signal === "buy" || input.signal === "sell") score += SIGNAL_NORMAL_BONUS;
  else score += SIGNAL_NEUTRAL_ZERO;

  const allLevels = [...input.supportLevels, ...input.resistanceLevels];
  if (allLevels.length > 0 && input.currentPrice > 0) {
    let closestDist = Infinity;
    for (const level of allLevels) {
      const dist = Math.abs(level - input.currentPrice) / input.currentPrice;
      if (dist < closestDist) closestDist = dist;
    }
    if (closestDist < SR_CLOSE_THRESHOLD) score += SR_CLOSE_QUALITY;
    else if (closestDist < SR_MODERATE_THRESHOLD) score += SR_MODERATE_QUALITY;
    else score += SR_FAR_QUALITY;
  } else {
    score -= SR_NONE_PENALTY;
  }

  return clamp(score, 0, 100);
}

function validateTrade(
  direction: TradeDirection | null,
  entry: number,
  stopLoss: number,
  risk: number,
  takeProfit: TakeProfitLevels,
  tradeQuality: number,
): { isValid: boolean; reason: string | null } {
  const reasons: string[] = [];

  if (direction === null) {
    reasons.push("Signal is neutral; cannot determine direction");
  } else {
    if (entry <= 0) reasons.push("Entry is invalid");
    if (stopLoss <= 0) reasons.push("Stop loss is invalid");
    if (risk <= 0) reasons.push("Risk must be greater than zero");

    if (direction === "long" && entry <= stopLoss) {
      reasons.push("Entry must be above stop loss for long trade");
    }
    if (direction === "short" && entry >= stopLoss) {
      reasons.push("Entry must be below stop loss for short trade");
    }

    if (direction === "long" && takeProfit.tp1 <= entry) {
      reasons.push("Take profit must be above entry for long trade");
    }
    if (direction === "short" && takeProfit.tp1 >= entry) {
      reasons.push("Take profit must be below entry for short trade");
    }
  }

  if (tradeQuality < MIN_TRADE_QUALITY) {
    reasons.push(`Trade quality (${tradeQuality}) is below minimum (${MIN_TRADE_QUALITY})`);
  }

  if (reasons.length > 0) {
    return { isValid: false, reason: reasons.join("; ") };
  }

  return { isValid: true, reason: null };
}

export function generateTrade(input: TradeSetupInput): TradeSetupOutput {
  const direction = determineDirection(input.signal);

  if (direction === null) {
    return {
      direction: null,
      entry: 0,
      stopLoss: 0,
      risk: 0,
      takeProfit: { tp1: 0, tp2: 0, tp3: 0 },
      riskPercent: 0,
      tradeQuality: 0,
      isValid: false,
      reason: "Signal is neutral; cannot determine direction",
    };
  }

  const entry = calcEntry(direction, input);
  const stopLoss = calcStopLoss(direction, entry, input);
  const risk = roundTo(Math.abs(entry - stopLoss), 2);
  const takeProfit = calcTakeProfit(direction, entry, risk);
  const riskPercent = calcRiskPercent(input.volatility);
  const tradeQuality = calcTradeQuality(direction, input);
  const { isValid, reason } = validateTrade(direction, entry, stopLoss, risk, takeProfit, tradeQuality);

  return {
    direction,
    entry,
    stopLoss,
    risk,
    takeProfit,
    riskPercent,
    tradeQuality,
    isValid,
    reason,
  };
}

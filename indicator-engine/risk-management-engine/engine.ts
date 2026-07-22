import type { TradeSetupRawInput, TradeSetupResult, TradeDirection } from "./types";
import { calculateEntry } from "./entry-engine";
import { calculateStopLoss } from "./stoploss-engine";
import { calculateTakeProfit } from "./takeprofit-engine";
import { calculateRiskReward } from "./riskreward-engine";
import { calculatePositionSize } from "./position-size-engine";
import { calculateTradeQuality } from "./trade-quality-engine";
import { calculateExpectedProfit } from "./expected-profit-engine";
import { validatePreConditions, validateSetup } from "./validation-engine";

function determineDirection(input: TradeSetupRawInput): TradeDirection | null {
  if (input.signal === "strong_buy" || input.signal === "buy") return "long";
  if (input.signal === "strong_sell" || input.signal === "sell") return "short";
  return null;
}

function noTrade(reason: string, accountBalance?: number, riskPercent?: number): TradeSetupResult {
  return {
    hasTrade: false,
    direction: "long",
    entry: 0,
    stopLoss: 0,
    risk: 0,
    takeProfit: { tp1: 0, tp2: 0, tp3: 0 },
    riskReward: calculateRiskReward(),
    position: calculatePositionSize(accountBalance ?? 0, 0, riskPercent),
    expectedProfit: { tp1: 0, tp2: 0, tp3: 0 },
    tradeQuality: 0,
    validation: { isValid: false, reason },
  };
}

export function generateTradeSetup(input: TradeSetupRawInput): TradeSetupResult {
  const direction = determineDirection(input);

  if (direction === null) {
    return noTrade("Signal is neutral — cannot determine trade direction", input.accountBalance, input.riskPercent);
  }

  const preCheck = validatePreConditions(input);
  if (!preCheck.isValid) {
    return noTrade(preCheck.reason!, input.accountBalance, input.riskPercent);
  }

  const entry = calculateEntry(direction, input);
  const stopLoss = calculateStopLoss(direction, entry, input);
  const risk = Math.abs(entry - stopLoss);
  const takeProfit = calculateTakeProfit(direction, entry, risk);
  const riskReward = calculateRiskReward();
  const position = calculatePositionSize(input.accountBalance, risk, input.riskPercent);
  const tradeQuality = calculateTradeQuality(direction, input);
  const expectedProfit = calculateExpectedProfit(direction, entry, takeProfit, position.positionSize);

  const postCheck = validateSetup(direction, entry, stopLoss, risk, takeProfit.tp1, tradeQuality, input);
  if (!postCheck.isValid) {
    return noTrade(postCheck.reason!, input.accountBalance, input.riskPercent);
  }

  return {
    hasTrade: true,
    direction,
    entry,
    stopLoss,
    risk: Math.round(risk * 100) / 100,
    takeProfit,
    riskReward,
    position,
    expectedProfit,
    tradeQuality,
    validation: { isValid: true, reason: null },
  };
}

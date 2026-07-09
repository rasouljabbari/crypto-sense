import type { TradeSetupRawInput, TradeSetupResult, TradeDirection } from "./types";
import { calculateEntry } from "./entry-engine";
import { calculateStopLoss } from "./stoploss-engine";
import { calculateTakeProfit } from "./takeprofit-engine";
import { calculateRiskReward } from "./riskreward-engine";
import { calculatePositionSize } from "./position-size-engine";
import { calculateTradeQuality } from "./trade-quality-engine";
import { calculateExpectedProfit } from "./expected-profit-engine";
import { validateSetup } from "./validation-engine";

function determineDirection(input: TradeSetupRawInput): TradeDirection | null {
  if (input.signal === "strong_buy" || input.signal === "buy") return "long";
  if (input.signal === "strong_sell" || input.signal === "sell") return "short";
  return null;
}

export function generateTradeSetup(input: TradeSetupRawInput): TradeSetupResult {
  const direction = determineDirection(input);

  if (direction === null) {
    return {
      direction: "long",
      entry: 0,
      stopLoss: 0,
      risk: 0,
      takeProfit: { tp1: 0, tp2: 0, tp3: 0 },
      riskReward: calculateRiskReward(),
      position: calculatePositionSize(input.accountBalance, 0, input.riskPercent),
      expectedProfit: { tp1: 0, tp2: 0, tp3: 0 },
      tradeQuality: 0,
      validation: { isValid: false, reason: "Signal is neutral; cannot determine direction" },
    };
  }

  const entry = calculateEntry(direction, input);
  const stopLoss = calculateStopLoss(direction, entry, input);
  const risk = Math.abs(entry - stopLoss);
  const takeProfit = calculateTakeProfit(direction, entry, risk);
  const riskReward = calculateRiskReward();
  const position = calculatePositionSize(input.accountBalance, risk, input.riskPercent);
  const tradeQuality = calculateTradeQuality(direction, input);
  const expectedProfit = calculateExpectedProfit(direction, entry, takeProfit, position.positionSize);
  const validation = validateSetup(direction, entry, stopLoss, risk, takeProfit.tp1, tradeQuality, input);

  return {
    direction,
    entry,
    stopLoss,
    risk: Math.round(risk * 100) / 100,
    takeProfit,
    riskReward,
    position,
    expectedProfit,
    tradeQuality,
    validation,
  };
}

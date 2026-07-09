import type { TradeDirection, TradeSetupRawInput } from "../types";
import { ENTRY_ATR_MULTIPLIER, ENTRY_ATR_VOLATILITY_MULTIPLIER } from "../config";
import { roundTo } from "../utils";

function nearestBelow(levels: readonly number[], price: number): number | null {
  const below = levels.filter((l) => l < price).sort((a, b) => b - a);
  return below.length > 0 ? below[0] : null;
}

function nearestAbove(levels: readonly number[], price: number): number | null {
  const above = levels.filter((l) => l > price).sort((a, b) => a - b);
  return above.length > 0 ? above[0] : null;
}

function atrBuffer(atr: number, multiplier: number): number {
  return atr * multiplier;
}

export function calculateEntry(
  direction: TradeDirection,
  input: TradeSetupRawInput,
): number {
  const { currentPrice, atr, volatility } = input;
  const baseBuffer = atrBuffer(atr, ENTRY_ATR_MULTIPLIER);
  const volBuffer = volatility.label === "high" || volatility.label === "extreme"
    ? atrBuffer(atr, ENTRY_ATR_VOLATILITY_MULTIPLIER)
    : 0;
  const buffer = baseBuffer + volBuffer;

  if (direction === "long") {
    const support = nearestBelow(input.supportLevels, currentPrice);
    if (support !== null) {
      return roundTo(Math.max(currentPrice, support + buffer), 2);
    }
    return roundTo(currentPrice, 2);
  }

  const resistance = nearestAbove(input.resistanceLevels, currentPrice);
  if (resistance !== null) {
    return roundTo(Math.min(currentPrice, resistance - buffer), 2);
  }
  return roundTo(currentPrice, 2);
}

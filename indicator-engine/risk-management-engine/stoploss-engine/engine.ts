import type { TradeDirection, TradeSetupRawInput } from "../types";
import { STOP_ATR_MULTIPLIER, STOP_SUPPORT_BUFFER, STOP_RESISTANCE_BUFFER } from "../config";
import { roundTo } from "../utils";

function nearestBelow(levels: readonly number[], price: number): number | null {
  const below = levels.filter((l) => l < price).sort((a, b) => b - a);
  return below.length > 0 ? below[0] : null;
}

function nearestAbove(levels: readonly number[], price: number): number | null {
  const above = levels.filter((l) => l > price).sort((a, b) => a - b);
  return above.length > 0 ? above[0] : null;
}

export function calculateStopLoss(
  direction: TradeDirection,
  entry: number,
  input: TradeSetupRawInput,
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

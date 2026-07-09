import type { TradeDirection, TakeProfitLevels, ExpectedProfit } from "../types";
import { roundTo } from "../utils";

export function calculateExpectedProfit(
  direction: TradeDirection,
  entry: number,
  takeProfit: TakeProfitLevels,
  positionSize: number,
): ExpectedProfit {
  if (positionSize <= 0) {
    return { tp1: 0, tp2: 0, tp3: 0 };
  }

  if (direction === "long") {
    return {
      tp1: roundTo((takeProfit.tp1 - entry) * positionSize, 2),
      tp2: roundTo((takeProfit.tp2 - entry) * positionSize, 2),
      tp3: roundTo((takeProfit.tp3 - entry) * positionSize, 2),
    };
  }

  return {
    tp1: roundTo((entry - takeProfit.tp1) * positionSize, 2),
    tp2: roundTo((entry - takeProfit.tp2) * positionSize, 2),
    tp3: roundTo((entry - takeProfit.tp3) * positionSize, 2),
  };
}

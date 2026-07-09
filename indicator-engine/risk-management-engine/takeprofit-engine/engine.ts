import type { TradeDirection, TakeProfitLevels } from "../types";
import { TP_RATIO_1, TP_RATIO_2, TP_RATIO_3 } from "../config";
import { roundTo } from "../utils";

export function calculateTakeProfit(
  direction: TradeDirection,
  entry: number,
  risk: number,
): TakeProfitLevels {
  if (risk <= 0) {
    return { tp1: entry, tp2: entry, tp3: entry };
  }

  if (direction === "long") {
    return {
      tp1: roundTo(entry + risk * TP_RATIO_1, 2),
      tp2: roundTo(entry + risk * TP_RATIO_2, 2),
      tp3: roundTo(entry + risk * TP_RATIO_3, 2),
    };
  }

  return {
    tp1: roundTo(entry - risk * TP_RATIO_1, 2),
    tp2: roundTo(entry - risk * TP_RATIO_2, 2),
    tp3: roundTo(entry - risk * TP_RATIO_3, 2),
  };
}

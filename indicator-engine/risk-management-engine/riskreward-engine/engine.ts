import type { RiskRewardRatios } from "../types";
import { TP_RATIO_1, TP_RATIO_2, TP_RATIO_3 } from "../config";

export function calculateRiskReward(): RiskRewardRatios {
  return {
    tp1: TP_RATIO_1,
    tp2: TP_RATIO_2,
    tp3: TP_RATIO_3,
  };
}

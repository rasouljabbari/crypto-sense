import type { PositionSizing } from "../types";
import { DEFAULT_RISK_PERCENT, MIN_RISK_PERCENT, MAX_RISK_PERCENT } from "../config";
import { roundTo } from "../utils";

export function calculatePositionSize(
  accountBalance: number,
  risk: number,
  riskPercent?: number,
): PositionSizing {
  const raw = riskPercent ?? DEFAULT_RISK_PERCENT;
  const pct = Number.isFinite(raw)
    ? Math.round(Math.max(MIN_RISK_PERCENT, Math.min(MAX_RISK_PERCENT, raw)) * 100) / 100
    : DEFAULT_RISK_PERCENT;
  const riskAmount = roundTo(accountBalance * (pct / 100), 2);
  const positionSize = risk > 0
    ? roundTo(riskAmount / risk, 4)
    : 0;

  return {
    accountBalance,
    riskPercent: pct,
    riskAmount,
    positionSize,
  };
}

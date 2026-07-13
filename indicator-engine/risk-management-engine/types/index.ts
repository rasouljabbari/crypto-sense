import type { VolatilityResult, TrendDirection, TrendStrengthResult, RiskLevel, SignalAction } from "../../types";

export type { TrendDirection, RiskLevel, SignalAction };
export type TradeDirection = "long" | "short";

export interface TradeSetupRawInput {
  readonly currentPrice: number;
  readonly trendDirection: TrendDirection;
  readonly trendStrength: TrendStrengthResult;
  readonly supportLevels: readonly number[];
  readonly resistanceLevels: readonly number[];
  readonly atr: number;
  readonly adx: number;
  readonly ema20: number;
  readonly ema50: number;
  readonly ema200: number;
  readonly volatility: VolatilityResult;
  readonly riskLevel: RiskLevel;
  readonly overallScore: number;
  readonly signal: SignalAction;
  readonly accountBalance: number;
  readonly riskPercent?: number;
}

export interface TakeProfitLevels {
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
}

export interface RiskRewardRatios {
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
}

export interface PositionSizing {
  readonly accountBalance: number;
  readonly riskPercent: number;
  readonly riskAmount: number;
  readonly positionSize: number;
}

export interface ExpectedProfit {
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly reason: string | null;
}

export interface TradeSetupResult {
  readonly hasTrade: boolean;
  readonly direction: TradeDirection;
  readonly entry: number;
  readonly stopLoss: number;
  readonly risk: number;
  readonly takeProfit: TakeProfitLevels;
  readonly riskReward: RiskRewardRatios;
  readonly position: PositionSizing;
  readonly expectedProfit: ExpectedProfit;
  readonly tradeQuality: number;
  readonly validation: ValidationResult;
}

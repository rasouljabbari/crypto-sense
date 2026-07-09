export type SignalAction = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";
export type TradeDirection = "long" | "short";
export type VolatilityLabel = "low" | "medium" | "high" | "extreme";
export type TrendDirection = "bullish" | "bearish" | "neutral";

export interface TradeSetupInput {
  readonly currentPrice: number;
  readonly signal: SignalAction;
  readonly atr: number;
  readonly supportLevels: readonly number[];
  readonly resistanceLevels: readonly number[];
  readonly trend: TrendDirection;
  readonly volatility: VolatilityLabel;
}

export interface TakeProfitLevels {
  readonly tp1: number;
  readonly tp2: number;
  readonly tp3: number;
}

export interface TradeSetupOutput {
  readonly direction: TradeDirection | null;
  readonly entry: number;
  readonly stopLoss: number;
  readonly risk: number;
  readonly takeProfit: TakeProfitLevels;
  readonly riskPercent: number;
  readonly tradeQuality: number;
  readonly isValid: boolean;
  readonly reason: string | null;
}

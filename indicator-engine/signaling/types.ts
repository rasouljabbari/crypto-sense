export type SignalAction = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";

export interface SignalResult {
  readonly action: SignalAction;
  readonly score: number;
}

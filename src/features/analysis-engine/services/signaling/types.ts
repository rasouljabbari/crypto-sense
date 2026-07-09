// ---------------------------------------------------------------------------
// Trading Signal Engine — Types
// ---------------------------------------------------------------------------

export type TradingSignalType =
  | "strong_buy"
  | "buy"
  | "neutral"
  | "sell"
  | "strong_sell";

export interface SignalContribution {
  readonly name: string;
  readonly weight: number;
  readonly raw: number;
  readonly contribution: number;
}

export interface TradingSignalOutput {
  readonly signal: TradingSignalType;
  readonly score: number;
  readonly confidence: number;
  readonly factors: readonly SignalContribution[];
}

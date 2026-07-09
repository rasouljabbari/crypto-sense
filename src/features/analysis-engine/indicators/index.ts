// ---------------------------------------------------------------------------
// Indicator Engine — Public Interface
// Every indicator is a pure function with a strongly typed return.
// Zero side effects. 100% testable.
// ---------------------------------------------------------------------------

export { rsi } from "./rsi";
export { macd } from "./macd";
export { ema } from "./ema";
export { atr } from "./atr";
export { adx } from "./adx";
export { obv } from "./obv";
export { vwap } from "./vwap";
export { bollingerBands } from "./bollinger";
export { stochasticRsi } from "./stochastic-rsi";
export { superTrend } from "./super-trend";
export { ichimoku } from "./ichimoku";
export { supportResistance } from "./support-resistance";
export { trendDirection } from "./trend-direction";
export { trendStrength } from "./trend-strength";

// Re-export helpers for advanced composition
export {
  calcSma,
  calcEma,
  calcTrueRange,
  calcTypicalPrice,
  wilderSmooth,
} from "./_helpers";

// Re-export result types
export type {
  RsiResult,
  MacdResult,
  MovingAverageResult,
  AtrResult,
  AdxResult,
  ObvResult,
  VwapResult,
  BollingerBandResult,
  StochasticRsiResult,
  SuperTrendResult,
  IchimokuResult,
  SupportResistanceResult,
  TrendStrengthResult,
} from "../types";

export type { TrendDirection, SignalStrength } from "../types";

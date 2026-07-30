export { evaluateSetup, validateMarketData, determineTradeability, determineDirection, determineSetupQuality, determineFinalStatus } from "./engine";
export type { SetupInput, SetupResult, Position, Signal, TrendLabel, RiskLevel, Recommendation, ReasonCode, TradeSetupData, TpLevels, TrendAnalysis, TimeframeTrend, MarketDataStatus, Stage0Result, Stage0ValidResult, Stage0InvalidResult, LastClosedCandle, Tradeability, Stage1Result, MarketDirection, Stage2Result, SetupQuality, Stage3Result, FinalStatus, Stage4Result } from "./engine";
export { generateExplanation } from "./explainer";
export type { Explanation } from "./explainer";
export {
  buildSetupReasons, buildSetupWarnings, ANALYSIS_VERSION,
  REASON_MARKET_DATA_VALIDATED, REASON_MARKET_CONTEXT_HEALTHY,
  REASON_NOT_TRADEABLE, REASON_TREND_STRUCTURE_CONFIRMED,
  REASON_TREND_NOT_CONFIRMED, REASON_QUALITY_EXCELLENT,
  REASON_QUALITY_STRONG, REASON_QUALITY_MODERATE, REASON_QUALITY_WEAK,
  REASON_MOMENTUM_EXPANSION, REASON_MOMENTUM_BUILDING,
  REASON_VOLUME_EXPANSION, REASON_VOLUME_AVERAGE,
  REASON_TREND_ALIGNMENT_POSITIVE, REASON_TECHNICAL_STRUCTURE_SOUND,
  REASON_BREAKOUT_TRIGGERED, REASON_BREAKDOWN_TRIGGERED,
  REASON_RISK_REWARD_ACCEPTABLE, REASON_RISK_REWARD_BORDERLINE,
  REASON_HIGH_CONFIDENCE, REASON_MODERATE_CONFIDENCE,
  REASON_TRADE_QUALITY_GOOD, REASON_WATCH_SETUP_FORMING,
  REASON_PIPELINE_STOPPED,
  WARN_CLOSE_TO_RESISTANCE, WARN_APPROACHING_RESISTANCE,
  WARN_CLOSE_TO_SUPPORT, WARN_APPROACHING_SUPPORT,
  WARN_RSI_OVERBOUGHT, WARN_RSI_OVERSOLD, WARN_RISK_HIGH,
  WARN_VOLUME_BELOW_AVERAGE, WARN_SCORE_BELOW_THRESHOLD, WARN_LOW_CONFIDENCE,
} from "./reason-builder";
export type { ReasonBuilderParams } from "./reason-builder";

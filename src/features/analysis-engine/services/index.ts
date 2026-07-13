// ---------------------------------------------------------------------------
// Services — Public Interface
// ---------------------------------------------------------------------------

export { MarketEngine } from "./marketEngine";
export type { MarketEngineOptions } from "./marketEngine";

export { calculateScores } from "./scoring";
export type {
  ScoreEngineInput,
  ScoreEngineOutput,
  ScoreBreakdown,
  ComponentDetail,
  FactorContribution,
} from "./scoring";

export { generateTradingSignal } from "./signaling";
export type {
  TradingSignalType,
  TradingSignalOutput,
  SignalContribution,
} from "./signaling";

export { NewsEngine, processNews, jaccardSimilarity, deduplicate, rankArticles, groupArticles } from "./newsEngine";
export type {
  NormalizedArticle,
  NewsGroup,
  NewsEngineInput,
  NewsEngineOutput,
} from "./newsEngine";

export { buildTradeSetup } from "./tradeSetup";
export type { TradeSetupResult } from "indicator-engine/risk-management-engine";

export { generateExplanation } from "./explanation";
export type { ExplanationData } from "./explanation";

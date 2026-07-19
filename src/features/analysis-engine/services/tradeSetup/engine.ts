import { generateTradeSetup } from "indicator-engine/risk-management-engine";
import { trendStrength, volatility } from "indicator-engine";
import type { RiskLevel } from "indicator-engine/risk/types";
import type { TradeSetupResult } from "indicator-engine/risk-management-engine";
import type { MarketSnapshot } from "../../types";
import type { IndicatorInput } from "../scoring";
import type { ScoreEngineOutput } from "../scoring";
import type { TradingSignalOutput } from "../signaling";

const DEFAULT_ACCOUNT_BALANCE = 10_000;

function mapRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 80) return "very_low";
  if (riskScore >= 60) return "low";
  if (riskScore >= 40) return "medium";
  if (riskScore >= 20) return "high";
  return "extreme";
}

export function buildTradeSetup(
  market: MarketSnapshot,
  scores: ScoreEngineOutput,
  signal: TradingSignalOutput,
  indicators: IndicatorInput,
): TradeSetupResult {
  const daily = market.candles["1d"];
  const closes = daily.map((c) => c.close);

  return generateTradeSetup({
    currentPrice: market.price.current,
    trendDirection: indicators.trendDirection,
    trendStrength: trendStrength(indicators.adx.adx),
    supportLevels: indicators.supportResistance.supportLevels.map((l) => l.price),
    resistanceLevels: indicators.supportResistance.resistanceLevels.map((l) => l.price),
    atr: indicators.atr.value,
    adx: indicators.adx.adx,
    ema20: indicators.ema20.value,
    ema50: indicators.ema50.value,
    ema200: indicators.ema200.value,
    volatility: volatility(closes),
    riskLevel: mapRiskLevel(scores.risk),
    overallScore: scores.overall,
    signal: signal.signal,
    accountBalance: DEFAULT_ACCOUNT_BALANCE,
  });
}

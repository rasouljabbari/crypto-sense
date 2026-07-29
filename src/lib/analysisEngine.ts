import { MarketData, TechnicalIndicators, CoinAnalysis, SignalType, RiskLevel, TrendLabel, TradeStatus, TradeSetupData, ReasonCode } from "./types";
import { evaluateSetup } from "indicator-engine/setup-engine";
import type { SetupResult, TpLevels } from "indicator-engine/setup-engine";

// ── Main entry: thin wrapper around Crypto Sense Setup Engine ─────────
// Only this module consumes the engine. No other module makes decisions.
// Requires pre-computed technical indicators — no random/mock fallback.

export function analyzeCoin(
  marketData: MarketData,
  indicators: TechnicalIndicators,
  timeframe?: string,
  candleTimestamp?: number,
  dataTimestamp?: number,
): CoinAnalysis {
  // Build engine input from market data + technical indicators
  const input = {
    // Stage 0 fields
    coin: marketData.id,
    symbol: marketData.symbol,
    timeframe: timeframe ?? "unknown",
    lastCandleTimestamp: candleTimestamp,
    lastCandleClose: marketData.currentPrice,
    lastCandleHigh: marketData.high24h,
    lastCandleLow: marketData.low24h,
    lastCandleOpen: 0,
    lastCandleVolume: marketData.volume24h,
    candleCount: indicators.supportLevels.length > 0 ? 100 : undefined,
    dataTimestamp: dataTimestamp ?? Date.now(),
    // Market state
    currentPrice: marketData.currentPrice,
    priceChangePercent24h: marketData.priceChangePercent24h,
    volume24h: marketData.volume24h,
    marketCap: marketData.marketCap,
    // Technical indicators
    rsi: indicators.rsi,
    macdValue: indicators.macd.value,
    macdSignal: indicators.macd.signal,
    macdHistogram: indicators.macd.histogram,
    ema9: indicators.ema9,
    ema20: indicators.ema20,
    ema21: indicators.ema21,
    ema50: indicators.ema50,
    ema200: indicators.ema200,
    adx: indicators.adx,
    atr: indicators.atr,
    plusDI: indicators.plusDI,
    minusDI: indicators.minusDI,
    volumeChangePercent: indicators.volumeChangePercent,
    supportLevels: indicators.supportLevels,
    resistanceLevels: indicators.resistanceLevels,
  };

  // Run the single deterministic setup engine (includes Stage 0 validation)
  const r: SetupResult = evaluateSetup(input);

  // Map engine types back to app types
  const signal = r.signal as SignalType;
  const riskLevel = r.riskLevel as RiskLevel;
  const reasonCode = r.reasonCode as ReasonCode;

  function mapTradeSetup(ts: SetupResult["tradeSetup"]): TradeSetupData {
    const def: TpLevels = { tp1: 0, tp2: 0, tp3: 0 };
    return {
      hasTrade: ts.hasTrade,
      reason: ts.reason,
      direction: ts.direction as "long" | "short" | null,
      entry: ts.entry,
      stopLoss: ts.stopLoss,
      risk: ts.risk,
      takeProfit: ts.takeProfit ?? def,
      riskReward: ts.riskReward ?? def,
      expectedProfit: ts.expectedProfit ?? def,
      tradeQuality: ts.tradeQuality,
    };
  }

  return {
    coinId: marketData.id,
    position: r.position,
    overallScore: r.overallScore,
    volumeScore: r.volumeScore,
    trendScore: r.trendScore,
    momentumScore: r.momentumScore,
    technicalScore: r.technicalScore,
    riskScore: r.riskScore,
    marketData,
    technicalIndicators: indicators,
    trendAnalysis: r.trendAnalysis,
    lastUpdated: new Date().toISOString(),
    signal,
    confidence: r.confidence,
    tradeQuality: r.tradeQuality,
    riskLevel,
    riskReward: r.riskRewardString,
    trendLabel: r.trendLabel as TrendLabel,
    status: r.recommendation === "ready" ? "ready" as TradeStatus : "no_trade" as TradeStatus,
    recommendation: r.recommendation,
    recommendationReasonCode: reasonCode,
    recommendationReason: r.reason,
    recommendationColor: r.color,
    recommendationPriority: r.priority,
    tradeSetup: mapTradeSetup(r.tradeSetup),
  };
}

export function analyzeAllCoins(
  marketDataList: MarketData[],
  indicatorsMap: Record<string, TechnicalIndicators>,
  timeframe?: string,
  candleKey?: number,
): CoinAnalysis[] {
  const dataTimestamp = Date.now();
  return marketDataList.map((md) => {
    const ind = indicatorsMap[md.id];
    if (!ind) return null;
    return analyzeCoin(md, ind, timeframe, candleKey, dataTimestamp);
  }).filter((c): c is CoinAnalysis => c !== null);
}

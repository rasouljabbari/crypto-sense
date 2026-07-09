// ---------------------------------------------------------------------------
// Crypto Analysis Engine — Domain Models
// ---------------------------------------------------------------------------
// Clean Architecture entity layer.  No UI, no API, no logic.  Pure types.
// ---------------------------------------------------------------------------

// ─── Primitives ───────────────────────────────────────────────────────────

export type PositionType = "long" | "short" | "neutral";

export type TrendDirection = "bullish" | "bearish" | "neutral";

export type SignalStrength = "strong" | "moderate" | "weak";

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export type Timeframe =
  | "1m" | "5m" | "15m" | "30m"
  | "1h" | "4h"
  | "1d" | "1w" | "1M";

export type KlineInterval = Timeframe;

// ─── Coin ─────────────────────────────────────────────────────────────────

export interface Coin {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly image: string;
  readonly rank: number;
  readonly circulatingSupply: number;
  readonly totalSupply: number | null;
  readonly ath: number;
  readonly athDate: string;
  readonly atl: number;
  readonly atlDate: string;
}

// ─── MarketData ───────────────────────────────────────────────────────────

export interface MarketData {
  readonly coinId: string;
  readonly currentPrice: number;
  readonly marketCap: number;
  readonly volume24h: number;
  readonly priceChange24h: number;
  readonly priceChangePercent24h: number;
  readonly high24h: number;
  readonly low24h: number;
}

// ─── OHLCV (Candlestick) ──────────────────────────────────────────────────

export interface OHLCV {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

// ─── Indicator Results ────────────────────────────────────────────────────

export interface RsiResult {
  readonly value: number;
  readonly oversold: boolean;
  readonly overbought: boolean;
}

export interface MacdResult {
  readonly value: number;
  readonly signal: number;
  readonly histogram: number;
  readonly bullish: boolean;
}

export interface MovingAverageResult {
  readonly period: number;
  readonly value: number;
}

export interface BollingerBandResult {
  readonly upper: number;
  readonly middle: number;
  readonly lower: number;
  readonly width: number;
  readonly pricePosition: "above" | "below" | "inside";
}

export interface SupportResistanceResult {
  readonly supportLevels: readonly number[];
  readonly resistanceLevels: readonly number[];
}

export interface VolumeProfileResult {
  readonly totalVolume: number;
  readonly averageVolume: number;
  readonly volumeSpike: boolean;
  readonly spikeRatio: number;
}

export interface AtrResult {
  readonly value: number;
}

export interface AdxResult {
  readonly adx: number;
  readonly plusDI: number;
  readonly minusDI: number;
  readonly trend: "trending" | "ranging" | "strong";
}

export interface ObvResult {
  readonly value: number;
  readonly values: readonly number[];
  readonly trend: "rising" | "falling" | "flat";
}

export interface VwapResult {
  readonly value: number;
}

export interface StochasticRsiResult {
  readonly k: number;
  readonly d: number;
  readonly kValues: readonly number[];
  readonly dValues: readonly number[];
  readonly oversold: boolean;
  readonly overbought: boolean;
}

export interface SuperTrendResult {
  readonly value: number;
  readonly direction: "up" | "down";
  readonly signal: "buy" | "sell" | "neutral";
}

export interface IchimokuResult {
  readonly conversionLine: number;
  readonly baseLine: number;
  readonly leadingSpanA: number;
  readonly leadingSpanB: number;
  readonly laggingSpan: number;
  readonly cloud: "above" | "below" | "inside";
}

export interface TrendStrengthResult {
  readonly value: number;
  readonly label: SignalStrength;
}

// ─── TechnicalAnalysis (aggregated) ───────────────────────────────────────

export interface TechnicalAnalysis {
  readonly rsi: RsiResult;
  readonly macd: MacdResult;
  readonly ema: readonly MovingAverageResult[];
  readonly sma: readonly MovingAverageResult[];
  readonly bollingerBands: BollingerBandResult;
  readonly supportResistance: SupportResistanceResult;
  readonly volumeProfile: VolumeProfileResult;
  readonly trend: TrendDirection;
  readonly trendScore: number;
  readonly strength: SignalStrength;
}

// ─── News / Sentiment ─────────────────────────────────────────────────────

export type ArticleSentiment = "positive" | "negative" | "neutral";

export interface NewsArticle {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly sentiment: ArticleSentiment;
  readonly relatedCoins: readonly string[];
  readonly summary: string;
}

export interface NewsSentiment {
  readonly overall: ArticleSentiment;
  readonly score: number;
  readonly totalArticles: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
  readonly neutralCount: number;
  readonly positiveRatio: number;
  readonly recentNews: readonly NewsArticle[];
}

// ─── Fear & Greed ─────────────────────────────────────────────────────────

export interface FearGreedValue {
  readonly score: number;
  readonly classification: string;
}

export interface FearGreed {
  readonly now: FearGreedValue;
  readonly previous: FearGreedValue | null;
  readonly history: readonly FearGreedValue[];
  readonly trend: "improving" | "declining" | "stable";
}

// ─── CryptoScore (composite) ──────────────────────────────────────────────

export interface ComponentScore {
  readonly value: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface CryptoScore {
  readonly overall: number;
  readonly technical: ComponentScore;
  readonly trend: ComponentScore;
  readonly volume: ComponentScore;
  readonly sentiment: ComponentScore;
  readonly conviction: string;
}

// ─── TradingSignal ────────────────────────────────────────────────────────

export interface TradingSignal {
  readonly coinId: string;
  readonly position: PositionType;
  readonly score: number;
  readonly strength: SignalStrength;
  readonly timeframe: Timeframe;
  readonly direction: TrendDirection;
  readonly rationale: string;
  readonly generatedAt: string;
}

// ─── Entry / Exit levels ─────────────────────────────────────────────────

export interface EntryPoint {
  readonly price: number;
  readonly type: "market" | "limit" | "zone";
  readonly zoneLow: number | null;
  readonly zoneHigh: number | null;
}

export interface TakeProfit {
  readonly level: number;
  readonly targetPrice: number;
  readonly allocationPercent: number;
}

export interface StopLoss {
  readonly price: number;
  readonly percentFromEntry: number;
  readonly type: "hard" | "trailing" | "time";
}

// ─── RiskAnalysis ─────────────────────────────────────────────────────────

export interface RiskFactor {
  readonly name: string;
  readonly level: RiskLevel;
  readonly score: number;
  readonly description: string;
}

export interface RiskAnalysis {
  readonly overall: RiskLevel;
  readonly score: number;
  readonly factors: readonly RiskFactor[];
  readonly volatilityRisk: RiskLevel;
  readonly liquidityRisk: RiskLevel;
  readonly marketRisk: RiskLevel;
  readonly maxDrawdown: number;
  readonly riskRewardRatio: number;
}

// ─── AnalysisResult (complete) ────────────────────────────────────────────

export interface AnalysisResult {
  readonly coinId: string;
  readonly coin: Coin;
  readonly marketData: MarketData;
  readonly technicalAnalysis: TechnicalAnalysis;
  readonly cryptoScore: CryptoScore;
  readonly signal: TradingSignal;
  readonly sentiment: NewsSentiment;
  readonly fearGreed: FearGreed | null;
  readonly risk: RiskAnalysis;
  readonly entry: EntryPoint | null;
  readonly takeProfit: readonly TakeProfit[];
  readonly stopLoss: StopLoss | null;
  readonly analyzedAt: string;
  readonly dataFreshness: "live" | "stale" | "mock";
}

// ─── Price History ────────────────────────────────────────────────────────

export interface PriceHistory {
  readonly coinId: string;
  readonly interval: KlineInterval;
  readonly ohlcv: readonly OHLCV[];
  readonly startTime: string;
  readonly endTime: string;
}

// ─── Market Overview ──────────────────────────────────────────────────────

export interface MarketOverview {
  readonly totalMarketCap: number;
  readonly totalVolume24h: number;
  readonly btcDominance: number;
  readonly ethDominance: number;
  readonly bnbDominance: number;
  readonly othersDominance: number;
  readonly fearGreed: FearGreed | null;
  readonly topGainers: readonly TradingSignal[];
  readonly topLosers: readonly TradingSignal[];
  readonly updatedAt: string;
}

// ─── Score Weights (configurable) ─────────────────────────────────────────

export interface ScoreWeights {
  readonly technical: number;
  readonly trend: number;
  readonly volume: number;
  readonly sentiment: number;
}

// ─── Analysis Preferences ─────────────────────────────────────────────────

export interface AnalysisPreferences {
  readonly weights: ScoreWeights;
  readonly autoRefresh: boolean;
  readonly refreshIntervalMs: number;
  readonly validTimeframe: Timeframe;
}

// ─── Market Snapshot (Market Engine output) ───────────────────────────────

export interface PriceData {
  readonly current: number;
  readonly high24h: number;
  readonly low24h: number;
  readonly volume24h: number;
  readonly change24h: number;
  readonly changePercent24h: number;
}

export interface CandleCollection {
  readonly "1h": readonly OHLCV[];
  readonly "4h": readonly OHLCV[];
  readonly "1d": readonly OHLCV[];
}

export interface MarketSnapshot {
  readonly symbol: string;
  readonly coinId: string;
  readonly price: PriceData;
  readonly candles: CandleCollection;
  readonly fetchedAt: string;
}

// ─── State Envelope ───────────────────────────────────────────────────────

export interface AnalysisState {
  readonly results: Record<string, AnalysisResult>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: string | null;
}

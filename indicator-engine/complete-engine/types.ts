import type { OhlcvSample } from "../types";
import type {
  RsiResult,
  MacdResult,
  MovingAverageResult,
  BollingerBandResult,
  AtrResult,
  AdxResult,
  ObvResult,
  VwapResult,
  SupportResult,
  ResistanceResult,
  TrendDirectionResult,
  TrendStrengthResult,
  VolatilityResult,
  TrendDirection,
} from "../types";

export interface CompleteMarketData {
  readonly currentPrice: number;
  readonly priceChange24h: number;
  readonly priceChangePercent24h: number;
  readonly volume24h: number;
  readonly marketCap: number;
  readonly high24h: number;
  readonly low24h: number;
}

export interface CompleteIndicatorSnapshot {
  readonly rsi: RsiResult;
  readonly macd: MacdResult;
  readonly ema20: MovingAverageResult;
  readonly ema50: MovingAverageResult;
  readonly ema200: MovingAverageResult;
  readonly bollingerBands: BollingerBandResult;
  readonly atr: AtrResult;
  readonly adx: AdxResult;
  readonly obv: ObvResult;
  readonly vwap: VwapResult;
}

export interface CompleteDetectionSnapshot {
  readonly trend: TrendDirectionResult;
  readonly trendStrength: TrendStrengthResult;
  readonly support: SupportResult;
  readonly resistance: ResistanceResult;
  readonly volatility: VolatilityResult;
}

export interface CompleteMarketAnalysisResult {
  readonly symbol: string;
  readonly coinId: string;
  readonly timestamp: number;
  readonly candleCount: number;
  readonly candles: readonly OhlcvSample[];
  readonly marketData: CompleteMarketData;
  readonly indicators: CompleteIndicatorSnapshot;
  readonly detection: CompleteDetectionSnapshot;
}

export interface AnalyzeSymbolInput {
  readonly symbol: string;
  readonly interval?: string;
  readonly limit?: number;
}

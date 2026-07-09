import type { OhlcvSample, SmaResult, MovingAverageResult, RsiResult, MacdResult, BollingerBandResult, AtrResult, AdxResult, ObvResult, VwapResult, SupportResult, ResistanceResult, TrendDirectionResult, TrendStrengthResult, VolatilityResult } from "../types";
import type { ScoreEngineOutput } from "../scoring/types";
import type { SignalResult } from "../signaling/types";
import type { RiskResult } from "../risk/types";
import type { TradeSetupResult } from "../risk-management-engine/types";

export interface MarketAnalyzerInput {
  readonly candles: readonly OhlcvSample[];
  readonly currentPrice?: number;
  readonly accountBalance: number;
  readonly riskPercent?: number;
}

export interface IndicatorSnapshot {
  readonly sma20: SmaResult;
  readonly ema20: MovingAverageResult;
  readonly ema50: MovingAverageResult;
  readonly ema200: MovingAverageResult;
  readonly rsi: RsiResult;
  readonly macd: MacdResult;
  readonly bollingerBands: BollingerBandResult;
  readonly atr: AtrResult;
  readonly adx: AdxResult;
  readonly obv: ObvResult;
  readonly vwap: VwapResult;
  readonly support: SupportResult;
  readonly resistance: ResistanceResult;
  readonly trendDirection: TrendDirectionResult;
  readonly trendStrength: TrendStrengthResult;
  readonly volatility: VolatilityResult;
}

export interface MarketAnalysisResult {
  readonly currentPrice: number;
  readonly candleCount: number;
  readonly indicators: IndicatorSnapshot;
  readonly scores: ScoreEngineOutput;
  readonly signal: SignalResult;
  readonly risk: RiskResult;
  readonly tradeSetup: TradeSetupResult;
}

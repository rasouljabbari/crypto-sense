export interface RsiResult {
  readonly value: number;
  readonly oversold: boolean;
  readonly overbought: boolean;
}

export interface MovingAverageResult {
  readonly period: number;
  readonly value: number;
}

export interface SmaResult {
  readonly period: number;
  readonly value: number;
  readonly values: readonly number[];
}

export interface MacdResult {
  readonly value: number;
  readonly signal: number;
  readonly histogram: number;
  readonly bullish: boolean;
}

export interface BollingerBandResult {
  readonly upper: number;
  readonly middle: number;
  readonly lower: number;
  readonly width: number;
  readonly pricePosition: "above" | "below" | "inside";
}

export interface AtrResult {
  readonly value: number;
}

export interface AdxResult {
  readonly adx: number;
  readonly plusDI: number;
  readonly minusDI: number;
  readonly trend: "strong" | "trending" | "ranging";
}

export interface ObvResult {
  readonly value: number;
  readonly trend: "rising" | "falling" | "flat";
}

export interface VwapResult {
  readonly value: number;
}

export interface SupportResult {
  readonly levels: readonly number[];
}

export interface ResistanceResult {
  readonly levels: readonly number[];
}

export type TrendDirection = "bullish" | "bearish" | "neutral";

export interface TrendDirectionResult {
  readonly direction: TrendDirection;
  readonly bullishSignals: number;
  readonly bearishSignals: number;
}

export interface TrendStrengthResult {
  readonly value: number;
  readonly label: "strong" | "moderate" | "weak";
}

export interface VolatilityResult {
  readonly value: number;
  readonly annualized: number;
  readonly label: "low" | "medium" | "high" | "extreme";
}

export interface OhlcvSample {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export type { RiskLevel } from "../risk/types";
export type { SignalAction } from "../signaling/types";

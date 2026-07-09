import type { OhlcvSample } from "../types";
import type { MarketAnalyzerInput, MarketAnalysisResult } from "./types";

import { sma } from "../indicators/sma";
import { ema as emaIndicator } from "../indicators/ema";
import { rsi } from "../indicators/rsi";
import { macd } from "../indicators/macd";
import { bollingerBands } from "../indicators/bollinger";
import { atr as atrFn } from "../indicators/atr";
import { adx as adxFn } from "../indicators/adx";
import { obv as obvFn } from "../indicators/obv";
import { vwap as vwapFn } from "../indicators/vwap";
import { support as supportFn } from "../indicators/support";
import { resistance as resistanceFn } from "../indicators/resistance";
import { trendDirection as trendDirectionFn } from "../indicators/trend-direction";
import { trendStrength as trendStrengthFn } from "../indicators/trend-strength";
import { volatility as volatilityFn } from "../indicators/volatility";

import { calcEma } from "../utils";

import { SMA_DEFAULT, EMA20, EMA50, EMA200 } from "../constants";
import { calculateScores } from "../scoring";
import { signal as signalFn } from "../signaling";
import { calculateRisk } from "../risk";
import { generateTradeSetup } from "../risk-management-engine";

function extractCloses(candles: readonly OhlcvSample[]): number[] {
  return candles.map((c) => c.close);
}

function extractHighs(candles: readonly OhlcvSample[]): number[] {
  return candles.map((c) => c.high);
}

function extractLows(candles: readonly OhlcvSample[]): number[] {
  return candles.map((c) => c.low);
}

function extractVolumes(candles: readonly OhlcvSample[]): number[] {
  return candles.map((c) => c.volume);
}

export function analyzeMarket(input: MarketAnalyzerInput): MarketAnalysisResult {
  const { candles, accountBalance, riskPercent } = input;
  const closes = extractCloses(candles);
  const highs = extractHighs(candles);
  const lows = extractLows(candles);
  const volumes = extractVolumes(candles);
  const currentPrice = input.currentPrice ?? (closes.length > 0 ? closes[closes.length - 1] : 0);

  // ── Indicators ────────────────────────────────────────────────
  const sma20Result = sma(closes, SMA_DEFAULT);
  const ema20Result = emaIndicator(closes, EMA20);
  const ema50Result = emaIndicator(closes, EMA50);
  const ema200Result = emaIndicator(closes, EMA200);
  const rsiResult = rsi(closes);
  const macdResult = macd(closes);
  const bbResult = bollingerBands(closes);
  const atrResult = atrFn(highs, lows, closes);
  const adxResult = adxFn(highs, lows, closes);
  const obvResult = obvFn(closes, volumes);
  const vwapResult = vwapFn(highs, lows, closes, volumes);
  const supportResult = supportFn(highs, lows, closes);
  const resistanceResult = resistanceFn(highs, lows, closes);
  const volatilityResult = volatilityFn(closes);

  const ema20Full = calcEma(closes, EMA20);
  const ema50Full = calcEma(closes, EMA50);
  const trendDirResult = trendDirectionFn(closes, ema20Full, ema50Full);
  const trendStrResult = trendStrengthFn(adxResult.adx);

  // ── Score Engine ──────────────────────────────────────────────
  const scores = calculateScores({
    rsi: rsiResult,
    ema20: ema20Result,
    ema50: ema50Result,
    ema200: ema200Result,
    macd: macdResult,
    adx: adxResult,
    obv: obvResult,
    vwap: vwapResult,
    currentPrice,
    resistance: resistanceResult,
    support: supportResult,
    volatility: volatilityResult,
  });

  // ── Signal Engine ─────────────────────────────────────────────
  const signalResult = signalFn(scores.overall);

  // ── Risk Engine ───────────────────────────────────────────────
  const riskResult = calculateRisk({
    atr: atrResult,
    adx: adxResult,
    volatility: volatilityResult,
    support: supportResult,
    resistance: resistanceResult,
    currentPrice,
  });

  // ── Trade Setup ───────────────────────────────────────────────
  const tradeSetup = generateTradeSetup({
    currentPrice,
    trendDirection: trendDirResult.direction,
    trendStrength: trendStrResult,
    supportLevels: supportResult.levels,
    resistanceLevels: resistanceResult.levels,
    atr: atrResult.value,
    adx: adxResult.adx,
    ema20: ema20Result.value,
    ema50: ema50Result.value,
    ema200: ema200Result.value,
    volatility: volatilityResult,
    riskLevel: riskResult.riskLevel,
    overallScore: scores.overall,
    signal: signalResult.action,
    accountBalance,
    riskPercent,
  });

  return {
    currentPrice,
    candleCount: candles.length,
    indicators: {
      sma20: sma20Result,
      ema20: ema20Result,
      ema50: ema50Result,
      ema200: ema200Result,
      rsi: rsiResult,
      macd: macdResult,
      bollingerBands: bbResult,
      atr: atrResult,
      adx: adxResult,
      obv: obvResult,
      vwap: vwapResult,
      support: supportResult,
      resistance: resistanceResult,
      trendDirection: trendDirResult,
      trendStrength: trendStrResult,
      volatility: volatilityResult,
    },
    scores,
    signal: signalResult,
    risk: riskResult,
    tradeSetup,
  };
}

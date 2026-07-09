// ---------------------------------------------------------------------------
// Compute all indicators from a MarketSnapshot
// ---------------------------------------------------------------------------

import { rsi, macd, ema, bollingerBands, adx, atr, obv, stochasticRsi, supportResistance, trendDirection, calcEma } from "../indicators";
import type { MarketSnapshot } from "../types";
import type { IndicatorInput } from "../services/scoring";

export function computeIndicators(snapshot: MarketSnapshot): IndicatorInput {
  const daily = snapshot.candles["1d"];
  if (daily.length < 20) {
    return getFallbackIndicators();
  }

  const closes = daily.map((c) => c.close);
  const highs = daily.map((c) => c.high);
  const lows = daily.map((c) => c.low);
  const volumes = daily.map((c) => c.volume);

  const rsiResult = rsi(closes);
  const macdResult = macd(closes);
  const ema20Result = ema(closes, 20);
  const ema50Result = ema(closes, 50);
  const ema200Result = ema(closes, 200);

  const ema20Values = calcEma(closes, 20);
  const ema50Values = calcEma(closes, 50);

  return {
    rsi: rsiResult,
    macd: macdResult,
    ema20: ema20Result,
    ema50: ema50Result,
    ema200: ema200Result,
    bollingerBands: bollingerBands(closes),
    adx: adx(highs, lows, closes),
    atr: atr(highs, lows, closes),
    obv: obv(closes, volumes),
    stochasticRsi: stochasticRsi(closes),
    supportResistance: supportResistance(highs, lows, closes),
    trendDirection: trendDirection(closes, ema20Values, ema50Values),
  };
}

function getFallbackIndicators(): IndicatorInput {
  return {
    rsi: { value: 50, oversold: false, overbought: false },
    macd: { value: 0, signal: 0, histogram: 0, bullish: false },
    ema20: { period: 20, value: 0 },
    ema50: { period: 50, value: 0 },
    ema200: { period: 200, value: 0 },
    bollingerBands: { upper: 0, middle: 0, lower: 0, width: 0, pricePosition: "inside" },
    adx: { adx: 0, plusDI: 0, minusDI: 0, trend: "ranging" },
    atr: { value: 0 },
    obv: { value: 0, values: [], trend: "flat" },
    stochasticRsi: { k: 50, d: 50, kValues: [], dValues: [], oversold: false, overbought: false },
    supportResistance: { supportLevels: [], resistanceLevels: [] },
    trendDirection: "neutral",
  };
}

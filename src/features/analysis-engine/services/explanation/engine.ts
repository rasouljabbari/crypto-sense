import type { ScoreEngineOutput } from "../scoring";
import type { IndicatorInput } from "../scoring";
import type { MarketSnapshot } from "../../types";
import type { ExplanationData } from "./types";

export function generateExplanation(
  scores: ScoreEngineOutput,
  indicators: IndicatorInput,
  market: MarketSnapshot,
): ExplanationData {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  const { rsi, macd, ema20, ema50, ema200, adx, atr, stochasticRsi, obv, bollingerBands } = indicators;
  const overall = scores.overall;
  const riskScore = scores.risk;
  const confidence = scores.confidence;
  const price = market.price;

  // ── Trend strengths ────────────────────────────────────────────────────
  if (ema20.value > ema50.value && ema50.value > ema200.value) {
    strengths.push("Strong bullish EMA alignment (EMA20 > EMA50 > EMA200).");
  } else if (ema20.value > ema50.value) {
    strengths.push("Short-term trend is bullish (EMA20 above EMA50).");
  }

  if (adx.adx > 35) {
    strengths.push("Strong trend strength — clear directional move.");
  } else if (adx.adx > 25) {
    strengths.push("Moderate trend strength detected.");
  }

  if (price.current > ema200.value) {
    strengths.push("Price is above the long-term moving average (EMA200).");
  }

  // ── Momentum strengths ─────────────────────────────────────────────────
  if (rsi.value < 30) {
    strengths.push("RSI indicates oversold conditions — potential bounce.");
  } else if (rsi.value < 40) {
    strengths.push("RSI is in the low range — room for upside.");
  }

  if (macd.bullish && macd.value > macd.signal) {
    strengths.push("MACD confirms positive momentum.");
  }

  if (price.changePercent24h > 5) {
    strengths.push("Strong upward price movement in the last 24h.");
  } else if (price.changePercent24h > 2) {
    strengths.push("Positive price movement in the last 24h.");
  }

  // ── Volume strengths ───────────────────────────────────────────────────
  if (obv.trend === "rising") {
    strengths.push("Trading volume supports the current move.");
  }

  if (price.volume24h > 1_000_000_000) {
    strengths.push("High trading volume — strong market activity.");
  }

  // ── Volatility strengths ───────────────────────────────────────────────
  const atrPct = price.current > 0 ? (atr.value / price.current) * 100 : 0;
  if (atrPct < 1) {
    strengths.push("Low volatility — stable price action.");
  }

  // ── Trend weaknesses ──────────────────────────────────────────────────
  if (ema20.value < ema50.value && ema50.value < ema200.value) {
    weaknesses.push("Strong bearish EMA alignment (EMA20 < EMA50 < EMA200).");
  } else if (ema20.value < ema50.value) {
    weaknesses.push("Short-term trend is bearish (EMA20 below EMA50).");
  }

  if (adx.adx < 20) {
    weaknesses.push("Weak trend strength — market is ranging.");
  }

  if (price.current < ema200.value) {
    weaknesses.push("Price is below the long-term moving average (EMA200).");
  }

  // ── Momentum weaknesses ───────────────────────────────────────────────
  if (rsi.value > 70) {
    weaknesses.push("RSI indicates overbought conditions — potential pullback.");
  } else if (rsi.value > 60) {
    weaknesses.push("RSI is in the high range — approaching overbought.");
  }

  if (!macd.bullish && macd.value < macd.signal) {
    weaknesses.push("MACD shows negative momentum.");
  }

  if (stochasticRsi.k > 0.8) {
    weaknesses.push("StochRSI indicates overbought conditions.");
  }

  if (price.changePercent24h < -5) {
    weaknesses.push("Strong downward price movement in the last 24h.");
  } else if (price.changePercent24h < -2) {
    weaknesses.push("Negative price movement in the last 24h.");
  }

  // ── Volume weaknesses ─────────────────────────────────────────────────
  if (obv.trend === "falling") {
    weaknesses.push("Declining volume suggests weakening momentum.");
  }

  if (price.volume24h < 1_000_000) {
    weaknesses.push("Very low trading activity.");
  }

  // ── Volatility weaknesses ─────────────────────────────────────────────
  if (atrPct > 5) {
    weaknesses.push("Extreme volatility — unpredictable price swings.");
  } else if (atrPct > 3) {
    weaknesses.push("High volatility — increased price uncertainty.");
  }

  // ── Risks ─────────────────────────────────────────────────────────────
  if (riskScore < 30) {
    risks.push("Current setup has elevated risk.");
  }

  if (price.volume24h < 1_000_000) {
    risks.push("Very low liquidity — slippage likely on larger orders.");
  } else if (price.volume24h < 10_000_000) {
    risks.push("Low liquidity — execution risk on larger orders.");
  }

  if (atrPct > 5) {
    risks.push("High volatility increases position risk.");
  } else if (atrPct > 3) {
    risks.push("Moderate volatility — use appropriate position sizing.");
  }

  const nearestSupport = indicators.supportResistance.supportLevels.length > 0
    ? Math.max(...indicators.supportResistance.supportLevels.filter((l) => l.price < price.current).map((l) => l.price), 0)
    : price.current * 0.9;
  const nearestResistance = indicators.supportResistance.resistanceLevels.length > 0
    ? Math.min(...indicators.supportResistance.resistanceLevels.filter((l) => l.price > price.current).map((l) => l.price), price.current * 2)
    : price.current * 1.1;
  const srRange = price.current > 0 ? Math.abs(nearestResistance - nearestSupport) / price.current : 0;

  if (srRange < 0.02) {
    risks.push("Tight support/resistance range — limited upside potential.");
  }

  if (adx.adx < 20) {
    risks.push("Choppy market — trend-following strategies may underperform.");
  }

  if (confidence < 40) {
    risks.push("Low analysis confidence — limited data availability.");
  }

  // ── Opportunities ─────────────────────────────────────────────────────
  if (overall >= 60 && rsi.value < 40) {
    opportunities.push("Oversold RSI combined with bullish trend — potential entry point.");
  }

  if (overall >= 60 && obv.trend === "rising") {
    opportunities.push("Bullish trend confirmed by rising volume.");
  }

  if (overall < 40 && rsi.value > 60) {
    opportunities.push("Overbought RSI combined with bearish trend — potential short opportunity.");
  }

  if (atrPct < 1 && overall >= 50) {
    opportunities.push("Low volatility may precede a breakout move — watch for direction.");
  }

  if (srRange > 0.05) {
    opportunities.push("Wide support/resistance range — room for price movement.");
  }

  if (overall >= 60 && adx.adx > 35) {
    opportunities.push("Strong bullish trend with high conviction.");
  }

  if (overall < 40 && adx.adx > 35) {
    opportunities.push("Strong bearish trend with high conviction — consider reducing exposure.");
  }

  // ── Summary ───────────────────────────────────────────────────────────
  let summary: string;
  if (overall >= 80) {
    summary = "The market is currently in a strong bullish trend with multiple indicators confirming upward momentum.";
  } else if (overall >= 60) {
    summary = "The market shows bullish momentum with positive indicators supporting further upside.";
  } else if (overall >= 40) {
    summary = "The market is in a neutral phase with mixed signals across indicators.";
  } else if (overall >= 20) {
    summary = "The market shows bearish momentum with negative indicators suggesting further downside.";
  } else {
    summary = "The market is currently in a strong bearish trend with multiple indicators confirming downward pressure.";
  }

  // ── Recommendation ────────────────────────────────────────────────────
  let recommendation: string;
  if (confidence < 40) {
    recommendation = "WAIT — Insufficient data for a reliable signal. Monitor for clearer conditions.";
  } else if (overall >= 70 && confidence >= 60) {
    recommendation = "STRONG BUY — Consider opening a long position with proper risk management.";
  } else if (overall >= 60) {
    recommendation = "BUY — Bullish bias, consider accumulating on dips.";
  } else if (overall >= 40) {
    recommendation = "NEUTRAL — Wait for clearer signals before taking action.";
  } else if (overall >= 30) {
    recommendation = "SELL — Bearish bias, consider reducing exposure.";
  } else {
    recommendation = "STRONG SELL — Consider closing long positions and monitoring for reversal.";
  }

  return {
    summary,
    strengths,
    weaknesses,
    risks,
    opportunities,
    recommendation,
  };
}

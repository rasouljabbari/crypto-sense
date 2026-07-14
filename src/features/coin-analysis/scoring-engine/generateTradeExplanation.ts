// ---------------------------------------------------------------------------
// Coin Analysis — Trade Explanation
// ---------------------------------------------------------------------------
// Generates structured explanations from calculated scores/indicators.
// ---------------------------------------------------------------------------

import type {
  IndividualScores,
  TradeExplanation,
  TechnicalAnalysis,
} from "@/features/analysis-engine/types";

// ─── Explanation Builder ────────────────────────────────────────────────────

export const generateTradeExplanation = (
  scores: IndividualScores,
  ta: TechnicalAnalysis,
): TradeExplanation => {
  const { trend, momentum, volume, volatility, risk } = scores;
  const { rsi, macd, adx, bollingerBands, supportResistance } = ta;

  // Summary
  const summary = buildSummary(scores, ta);

  // Strengths
  const strengths = [
    ...trend.reasons.filter((r) => r.includes(">") || r.includes("Bullish")),
    ...momentum.reasons.filter((r) => r.includes("Bullish") || r.includes("Oversold")),
    ...volume.reasons.filter((r) => r.includes("Spike") || r.includes("Rising")),
    ...(adx.adx >= 25 ? [`ADX ${adx.adx} (Trending Market)`] : []),
    ...(rsi.oversold ? ["RSI Oversold (Potential Reversal)"] : []),
    ...(macd.bullish ? ["MACD Bullish Cross"] : []),
  ].filter(Boolean);

  // Weaknesses
  const weaknesses = [
    ...trend.reasons.filter((r) => r.includes("<") || r.includes("Bearish")),
    ...momentum.reasons.filter((r) => r.includes("Bearish") || r.includes("Overbought")),
    ...volume.reasons.filter((r) => r.includes("Falling") || r.includes("Low")),
    ...(adx.adx < 20 ? [`ADX ${adx.adx} (Weak Trend)`] : []),
    ...(rsi.overbought ? ["RSI Overbought (Potential Pullback)"] : []),
    ...(macd.histogram < 0 ? ["MACD Bearish"] : []),
  ].filter(Boolean);

  // Risks
  const risks = [
    ...risk.reasons.filter((r) => r.includes("High") || r.includes("No")),
    ...volatility.reasons.filter((r) => r.includes("High") || r.includes("Above")),
    ...(bollingerBands.pricePosition === "above" ? ["Price Above Bollinger Upper Band"] : []),
    ...(supportResistance.supportLevels.length === 0 ? ["No Clear Support"] : []),
    ...(supportResistance.resistanceLevels.length === 0 ? ["No Clear Resistance"] : []),
  ].filter(Boolean);

  // Recommendation
  const recommendation = buildRecommendation(scores, ta);

  return { summary, strengths, weaknesses, risks, recommendation };
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const buildSummary = (
  scores: IndividualScores,
  ta: TechnicalAnalysis,
): string => {
  const { trend, momentum, volume } = scores;
  const { rsi, macd, adx } = ta;

  const parts = [];

  if (trend.value >= 60) parts.push("Strong trend");
  if (momentum.value >= 60) parts.push("bullish momentum");
  if (volume.value >= 60) parts.push("high volume");
  if (adx.adx >= 25) parts.push("confirmed by ADX");
  if (rsi.oversold) parts.push("RSI oversold");
  if (macd.bullish) parts.push("MACD bullish");

  if (parts.length === 0) return "Neutral market conditions.";
  return `${parts.join(", ")}.`;
};

const buildRecommendation = (
  scores: IndividualScores,
  ta: TechnicalAnalysis,
): string => {
  const { overallScore } = { overallScore: { value: 0 } } as any;
  const { trend, momentum, risk } = scores;
  const { adx } = ta;

  if (overallScore.value >= 70 && adx.adx >= 25) {
    if (trend.value >= 60 && momentum.value >= 60) return "Strong Buy: Trend and momentum align.";
    return "Buy: Favorable conditions.";
  }

  if (overallScore.value <= 30 && adx.adx >= 25) {
    if (trend.value <= 40 && momentum.value <= 40) return "Strong Sell: Downtrend confirmed.";
    return "Sell: Weakening conditions.";
  }

  return "Neutral: Await clearer signal.";
};
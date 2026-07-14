// ---------------------------------------------------------------------------
// Coin Analysis — Trade Setup Generation
// ---------------------------------------------------------------------------
// Generates entry, stop-loss, take-profit levels if trade is valid.
// ---------------------------------------------------------------------------

import type {
  TechnicalAnalysis,
  TradeSetupResult,
} from "@/features/analysis-engine/types";
import {
  TP_RATIO_1,
  TP_RATIO_2,
  TP_RATIO_3,
} from "@/indicator-engine/risk-management-engine/config";

// ─── Trade Setup ───────────────────────────────────────────────────────────

export const generateTradeSetup = (
  ta: TechnicalAnalysis,
  overallScore: number,
  isValid: boolean,
): TradeSetupResult => {
  if (!isValid) return { hasTrade: false };

  const { currentPrice } = { currentPrice: ta.rsi.value } as any;
  const { trend, atr, supportResistance } = ta;
  const direction = trend === "bullish" ? 1 : -1;

  // Entry
  const entry = currentPrice + (direction * atr.value * 0.1);

  // Stop-loss
  const stopLoss = currentPrice - (direction * atr.value * 1.5);

  // Risk
  const risk = Math.abs(entry - stopLoss);

  // Take-profit
  const tp1 = entry + (direction * risk * TP_RATIO_1);
  const tp2 = entry + (direction * risk * TP_RATIO_2);
  const tp3 = entry + (direction * risk * TP_RATIO_3);

  // Trade Quality
  const tradeQuality = calculateTradeQuality(overallScore, ta);

  return {
    hasTrade: true,
    entry,
    stopLoss,
    takeProfit: { tp1, tp2, tp3 },
    tradeQuality,
    riskReward: TP_RATIO_1,
  };
};

// ─── Trade Quality ───────────────────────────────────────────────────────

const calculateTradeQuality = (
  overallScore: number,
  ta: TechnicalAnalysis,
): number => {
  const { adx, rsi, macd } = ta;
  let quality = overallScore * 0.7;

  // ADX
  if (adx.adx >= 50) quality += 15;
  else if (adx.adx >= 25) quality += 10;

  // RSI
  if (rsi.oversold && ta.trend === "bullish") quality += 10;
  else if (rsi.overbought && ta.trend === "bearish") quality += 10;

  // MACD
  if (macd.bullish && ta.trend === "bullish") quality += 5;
  else if (!macd.bullish && ta.trend === "bearish") quality += 5;

  return Math.min(100, Math.max(0, quality));
};
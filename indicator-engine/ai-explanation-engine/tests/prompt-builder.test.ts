import { describe, it, expect } from "vitest";
import { buildPrompt } from "../prompts/builder";
import type { MarketAnalysisResult } from "../../market-analyzer/types";

function makeSampleAnalysis(): MarketAnalysisResult {
  return {
    currentPrice: 50000,
    candleCount: 250,
    indicators: {
      sma20: { period: 20, value: 49000, values: [] },
      ema20: { period: 20, value: 49200 },
      ema50: { period: 50, value: 48000 },
      ema200: { period: 200, value: 45000 },
      rsi: { value: 55, oversold: false, overbought: false },
      macd: { value: 100, signal: 80, histogram: 20, bullish: true },
      bollingerBands: { upper: 52000, middle: 50000, lower: 48000, width: 0.08, pricePosition: "inside" },
      atr: { value: 1200 },
      adx: { adx: 28, plusDI: 25, minusDI: 18, trend: "trending" },
      obv: { value: 1_000_000, trend: "rising" },
      vwap: { value: 49500 },
      support: { levels: [48000, 46000] },
      resistance: { levels: [51000, 53000] },
      trendDirection: { direction: "bullish", bullishSignals: 5, bearishSignals: 1 },
      trendStrength: { value: 65, label: "moderate" },
      volatility: { value: 0.015, annualized: 0.25, label: "medium" },
    },
    scores: {
      technical: 60,
      trend: 70,
      momentum: 65,
      volume: 55,
      volatilityScore: 50,
      overall: 62,
      confidence: 70,
      breakdown: {
        technical: { value: 60, label: "bullish", factors: [] },
        trend: { value: 70, label: "bullish", factors: [] },
        momentum: { value: 65, label: "bullish", factors: [] },
        volume: { value: 55, label: "neutral", factors: [] },
        volatilityScore: { value: 50, label: "neutral", factors: [] },
        overall: { value: 62, label: "neutral", factors: [] },
        confidence: { value: 70, label: "bullish", factors: [] },
      },
    },
    signal: { action: "buy", score: 62 },
    risk: { riskScore: 35, riskLevel: "low", suggestedStopLoss: 48500, riskPercentage: 0.01 },
    tradeSetup: {
      direction: "long",
      entry: 50000,
      stopLoss: 48500,
      risk: 1500,
      takeProfit: { tp1: 51500, tp2: 53000, tp3: 54500 },
      riskReward: { tp1: 1, tp2: 2, tp3: 2 },
      position: { accountBalance: 10000, riskPercent: 1, riskAmount: 100, positionSize: 0.067 },
      expectedProfit: { tp1: 100, tp2: 200, tp3: 300 },
      tradeQuality: 65,
      validation: { isValid: true, reason: null },
    },
  };
}

describe("buildPrompt", () => {
  it("contains the instruction rules", () => {
    const prompt = buildPrompt(makeSampleAnalysis());
    expect(prompt).toContain("Never invent numbers");
    expect(prompt).toContain("Never change calculated values");
    expect(prompt).toContain("Maximum 250 words");
    expect(prompt).toContain("Return ONLY valid JSON");
  });

  it("contains all indicator values", () => {
    const prompt = buildPrompt(makeSampleAnalysis());
    expect(prompt).toContain("RSI: 55");
    expect(prompt).toContain("MACD");
    expect(prompt).toContain("ADX");
    expect(prompt).toContain("Trend Direction: bullish");
    expect(prompt).toContain("Trend Strength: moderate");
  });

  it("contains scores and signal", () => {
    const prompt = buildPrompt(makeSampleAnalysis());
    expect(prompt).toContain("Overall: 62/100");
    expect(prompt).toContain("Action: buy");
  });

  it("contains risk and trade setup data", () => {
    const prompt = buildPrompt(makeSampleAnalysis());
    expect(prompt).toContain("Risk Score: 35/100");
    expect(prompt).toContain("Risk Level: low");
    expect(prompt).toContain("TRADE SETUP:");
    expect(prompt).toContain("Entry: 50000");
    expect(prompt).toContain("Direction: long");
  });

  it("skips trade setup section when entry is 0", () => {
    const analysis = makeSampleAnalysis();
    analysis.tradeSetup.entry = 0;
    analysis.tradeSetup.validation.isValid = false;

    const prompt = buildPrompt(analysis);
    expect(prompt).not.toContain("Trade Setup:");
  });

  it("does not mutate input", () => {
    const analysis = makeSampleAnalysis();
    const original = JSON.stringify(analysis);
    buildPrompt(analysis);
    expect(JSON.stringify(analysis)).toBe(original);
  });
});

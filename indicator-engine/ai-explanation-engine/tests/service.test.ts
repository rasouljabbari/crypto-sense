import { describe, it, expect, vi } from "vitest";
import { AnalysisExplanationService } from "../service";
import type { AIProvider } from "../providers/abstract";
import type { MarketAnalysisResult } from "../../market-analyzer/types";

function makeMockProvider(response: string): AIProvider {
  return { generate: vi.fn().mockResolvedValue(response) };
}

function makeMinimalAnalysis(): MarketAnalysisResult {
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
      riskReward: { tp1: 1, tp2: 2, tp3: 3 },
      position: { accountBalance: 10000, riskPercent: 1, riskAmount: 100, positionSize: 0.067 },
      expectedProfit: { tp1: 100, tp2: 200, tp3: 300 },
      tradeQuality: 65,
      validation: { isValid: true, reason: null },
    },
  };
}

describe("AnalysisExplanationService", () => {
  it("returns parsed explanation from provider response", async () => {
    const provider = makeMockProvider(
      JSON.stringify({
        executiveSummary: "Bullish momentum with moderate risk",
        whyBuy: ["RSI in neutral zone leaving room for upside", "MACD bullish crossover"],
        whySell: ["Resistance near 51000"],
        marketSituation: "Price trading above key moving averages",
        mainRisks: ["ADX below 30 suggests weak trend conviction"],
        opportunities: ["Breakout above 51000 could trigger momentum"],
        shortConclusion: "Favorable setup with manageable risk",
        disclaimer: "This is not financial advice.",
      })
    );

    const service = new AnalysisExplanationService(provider);
    const result = await service.generate(makeMinimalAnalysis());

    expect(result.executiveSummary).toBe("Bullish momentum with moderate risk");
    expect(result.whyBuy).toHaveLength(2);
    expect(result.whySell).toHaveLength(1);
    expect(result.marketSituation).toBe("Price trading above key moving averages");
    expect(result.mainRisks).toHaveLength(1);
    expect(result.opportunities).toHaveLength(1);
    expect(result.shortConclusion).toBe("Favorable setup with manageable risk");
    expect(result.disclaimer).toBe("This is not financial advice.");
  });

  it("handles markdown-wrapped JSON in response", async () => {
    const provider = makeMockProvider(
      '```json\n{"executiveSummary":"test","marketSituation":"","shortConclusion":"","whyBuy":[],"whySell":[],"mainRisks":[],"opportunities":[]}\n```'
    );

    const service = new AnalysisExplanationService(provider);
    const result = await service.generate(makeMinimalAnalysis());

    expect(result.executiveSummary).toBe("test");
  });

  it("handles code-fence without language tag", async () => {
    const provider = makeMockProvider(
      '```\n{"executiveSummary":"test","marketSituation":"","shortConclusion":"","whyBuy":[],"whySell":[],"mainRisks":[],"opportunities":[]}\n```'
    );

    const service = new AnalysisExplanationService(provider);
    const result = await service.generate(makeMinimalAnalysis());

    expect(result.executiveSummary).toBe("test");
  });

  it("provides default values when fields are missing", async () => {
    const provider = makeMockProvider("{}");

    const service = new AnalysisExplanationService(provider);
    const result = await service.generate(makeMinimalAnalysis());

    expect(result.executiveSummary).toBe("");
    expect(result.whyBuy).toEqual([]);
    expect(result.whySell).toEqual([]);
    expect(result.marketSituation).toBe("");
    expect(result.mainRisks).toEqual([]);
    expect(result.shortConclusion).toBe("");
    expect(result.disclaimer).toBeTruthy();
  });

  it("throws when provider rejects", async () => {
    const provider: AIProvider = {
      generate: vi.fn().mockRejectedValue(new Error("Provider down")),
    };

    const service = new AnalysisExplanationService(provider);
    await expect(service.generate(makeMinimalAnalysis())).rejects.toThrow("Provider down");
  });

  it("throws when provider returns invalid JSON", async () => {
    const provider = makeMockProvider("not json at all");

    const service = new AnalysisExplanationService(provider);
    await expect(service.generate(makeMinimalAnalysis())).rejects.toThrow();
  });
});

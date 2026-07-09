import { describe, it, expect } from "vitest";
import { calculateTradeQuality } from "../trade-quality-engine";
import type { TradeSetupRawInput } from "../types";

function base(overrides?: Partial<TradeSetupRawInput>): TradeSetupRawInput {
  return {
    currentPrice: 100,
    trendDirection: "bullish",
    trendStrength: { value: 40, label: "moderate" },
    supportLevels: [95],
    resistanceLevels: [105],
    atr: 2,
    adx: 30,
    ema20: 102,
    ema50: 98,
    ema200: 95,
    volatility: { value: 25, annualized: 40, label: "medium" },
    riskLevel: "medium",
    overallScore: 65,
    signal: "buy",
    accountBalance: 10000,
    ...overrides,
  };
}

describe("Trade Quality Engine", () => {
  it("scores highest when all factors are bullish", () => {
    const r = calculateTradeQuality("long", base({
      trendStrength: { value: 60, label: "strong" },
      adx: 55,
      overallScore: 85,
      riskLevel: "very_low",
      signal: "strong_buy",
    }));
    // 25 + 20 + 25 + 15 + 15 = 100
    expect(r).toBe(100);
  });

  it("scores lowest when all factors are bearish for long", () => {
    const r = calculateTradeQuality("long", base({
      trendStrength: { value: 10, label: "weak" },
      adx: 15,
      overallScore: 25,
      riskLevel: "extreme",
      signal: "strong_sell",
    }));
    // 5 + 5 + 5 + 5 + 5 = 25
    expect(r).toBe(25);
  });

  it("scores well for bearish signal on short trade", () => {
    const r = calculateTradeQuality("short", base({
      trendStrength: { value: 60, label: "strong" },
      adx: 55,
      overallScore: 85,
      riskLevel: "low",
      signal: "strong_sell",
    }));
    // 25 + 20 + 25 + 15 + 15 = 100
    expect(r).toBe(100);
  });

  it("penalizes signal mismatch", () => {
    const r = calculateTradeQuality("long", base({
      signal: "sell",
      trendStrength: { value: 60, label: "strong" },
    }));
    // 25 + 15 + 20 + 5 + 10 = 75
    expect(r).toBe(75);
  });
});

import { describe, it, expect } from "vitest";
import { generateTradeSetup } from "../engine";
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

describe("Full Trade Setup Integration", () => {
  it("generates a complete LONG trade setup", () => {
    const r = generateTradeSetup(base());

    expect(r.direction).toBe("long");
    expect(r.entry).toBeGreaterThan(0);
    expect(r.stopLoss).toBeLessThan(r.entry);
    expect(r.risk).toBeGreaterThan(0);

    expect(r.takeProfit.tp1).toBeGreaterThan(r.entry);
    expect(r.takeProfit.tp2).toBeGreaterThan(r.takeProfit.tp1);
    expect(r.takeProfit.tp3).toBeGreaterThan(r.takeProfit.tp2);

    expect(r.riskReward.tp1).toBe(2);
    expect(r.riskReward.tp2).toBe(3);
    expect(r.riskReward.tp3).toBe(5);

    expect(r.position.accountBalance).toBe(10000);
    expect(r.position.riskAmount).toBeGreaterThan(0);
    expect(r.position.positionSize).toBeGreaterThan(0);

    expect(r.expectedProfit.tp1).toBeGreaterThan(0);
    expect(r.expectedProfit.tp2).toBeGreaterThan(r.expectedProfit.tp1);
    expect(r.expectedProfit.tp3).toBeGreaterThan(r.expectedProfit.tp2);

    expect(r.tradeQuality).toBeGreaterThanOrEqual(0);
    expect(r.tradeQuality).toBeLessThanOrEqual(100);

    expect(r.validation.isValid).toBe(true);
    expect(r.validation.reason).toBeNull();
  });

  it("generates a complete SHORT trade setup", () => {
    const r = generateTradeSetup(base({
      trendDirection: "bearish",
      signal: "sell",
      currentPrice: 100,
      supportLevels: [95],
      resistanceLevels: [105],
    }));

    expect(r.direction).toBe("short");
    expect(r.entry).toBeGreaterThan(0);
    expect(r.stopLoss).toBeGreaterThan(r.entry);
    expect(r.risk).toBeGreaterThan(0);

    expect(r.takeProfit.tp1).toBeLessThan(r.entry);
    expect(r.takeProfit.tp2).toBeLessThan(r.takeProfit.tp1);
    expect(r.takeProfit.tp3).toBeLessThan(r.takeProfit.tp2);

    expect(r.validation.isValid).toBe(true);
  });

  it("returns invalid setup when signal is neutral", () => {
    const r = generateTradeSetup(base({ signal: "neutral" }));
    expect(r.validation.isValid).toBe(false);
    expect(r.validation.reason).toContain("neutral");
  });

  it("passes through account balance and risk percent to position sizing", () => {
    const r = generateTradeSetup(base({ accountBalance: 5000 }));
    expect(r.position.accountBalance).toBe(5000);
    expect(r.position.riskPercent).toBe(1);
    expect(r.position.riskAmount).toBe(50); // 5000 * 0.01
  });

  it("produces correct risk/reward relationship", () => {
    const r = generateTradeSetup(base());
    const risk = r.risk;
    const tp1Profit = r.takeProfit.tp1 - r.entry;
    const tp2Profit = r.takeProfit.tp2 - r.entry;
    const tp3Profit = r.takeProfit.tp3 - r.entry;

    expect(tp1Profit / risk).toBeCloseTo(2, 0);
    expect(tp2Profit / risk).toBeCloseTo(3, 0);
    expect(tp3Profit / risk).toBeCloseTo(5, 0);
  });

  it("produces correct expected profit values", () => {
    const r = generateTradeSetup(base());
    const riskAmount = r.position.riskAmount;

    expect(r.expectedProfit.tp1).toBeCloseTo(riskAmount * r.riskReward.tp1, 0);
    expect(r.expectedProfit.tp2).toBeCloseTo(riskAmount * r.riskReward.tp2, 0);
    expect(r.expectedProfit.tp3).toBeCloseTo(riskAmount * r.riskReward.tp3, 0);
  });

  it("handles high volatility scenario", () => {
    const r = generateTradeSetup(base({
      trendStrength: { value: 55, label: "strong" },
      adx: 55,
      overallScore: 88,
      riskLevel: "very_low",
      signal: "strong_buy",
      volatility: { value: 65, annualized: 110, label: "high" },
    }));
    expect(r.validation.isValid).toBe(true);
    expect(r.tradeQuality).toBeGreaterThanOrEqual(90);
    expect(r.entry).toBeGreaterThan(0);
  });

  it("handles low volatility scenario", () => {
    const r = generateTradeSetup(base({
      volatility: { value: 10, annualized: 15, label: "low" },
    }));
    expect(r.validation.isValid).toBe(true);
  });

  it("handles bear market scenario", () => {
    const r = generateTradeSetup(base({
      trendDirection: "bearish",
      trendStrength: { value: 50, label: "strong" },
      signal: "strong_sell",
      adx: 52,
    }));
    expect(r.direction).toBe("short");
    expect(r.validation.isValid).toBe(true);
  });

  it("handles edge case with single support level", () => {
    const r = generateTradeSetup(base({
      supportLevels: [99.5],
      resistanceLevels: [100.5],
      currentPrice: 100,
      atr: 0.2,
    }));
    expect(r.validation.isValid).toBe(true);
    expect(r.entry).toBeGreaterThan(0);
  });
});

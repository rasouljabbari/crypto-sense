import { describe, it, expect } from "vitest";
import { calculateEntry } from "../entry-engine";
import type { TradeSetupRawInput } from "../types";

function base(overrides?: Partial<TradeSetupRawInput>): TradeSetupRawInput {
  return {
    currentPrice: 100,
    trendDirection: "bullish",
    trendStrength: { value: 40, label: "moderate" },
    supportLevels: [95, 90],
    resistanceLevels: [105, 110],
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

describe("Entry Engine", () => {
  describe("LONG", () => {
    it("enters at support + ATR buffer when support exists below price", () => {
      const r = calculateEntry("long", base());
      // support = 95, buffer = 2 * 0.5 = 1, max(100, 95+1) = 100
      expect(r).toBe(100);
    });

    it("enters at market when no support below price", () => {
      const r = calculateEntry("long", base({ supportLevels: [105], currentPrice: 100 }));
      expect(r).toBe(100);
    });

    it("adds extra buffer when volatility is high", () => {
      const r = calculateEntry("long", base({
        volatility: { value: 60, annualized: 100, label: "high" },
        supportLevels: [90],
      }));
      // support = 90, buffer = 2*0.5 + 2*0.3 = 1.6, max(100, 90+1.6) = 100
      expect(r).toBe(100);
    });

    it("uses market price when all support levels are above price", () => {
      const r = calculateEntry("long", base({
        currentPrice: 90,
        supportLevels: [95, 100],
      }));
      // no support below 90 → falls back to currentPrice
      expect(r).toBe(90);
    });
  });

  describe("SHORT", () => {
    it("enters at resistance - ATR buffer when resistance exists above price", () => {
      const r = calculateEntry("short", base());
      // resistance = 105, buffer = 1, min(100, 104) = 100
      expect(r).toBe(100);
    });

    it("enters at market when no resistance above price", () => {
      const r = calculateEntry("short", base({ resistanceLevels: [95], currentPrice: 100 }));
      expect(r).toBe(100);
    });

    it("adds extra buffer when volatility is extreme", () => {
      const r = calculateEntry("short", base({
        volatility: { value: 80, annualized: 150, label: "extreme" },
        resistanceLevels: [110],
      }));
      // resistance = 110, buffer = 1 + 0.6 = 1.6, min(100, 108.4) = 100
      expect(r).toBe(100);
    });

    it("uses market price when all resistance levels are below price", () => {
      const r = calculateEntry("short", base({
        currentPrice: 110,
        resistanceLevels: [105, 100],
      }));
      // no resistance above 110 → falls back to currentPrice
      expect(r).toBe(110);
    });
  });
});

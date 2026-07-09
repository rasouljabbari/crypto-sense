import { describe, it, expect } from "vitest";
import { calculateStopLoss } from "../stoploss-engine";
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

describe("Stop Loss Engine", () => {
  describe("LONG", () => {
    it("uses ATR-based stop when no support below entry", () => {
      const r = calculateStopLoss("long", 100, base({ supportLevels: [105] }));
      // 100 - 2*2 = 96
      expect(r).toBe(96);
    });

    it("uses support-based stop when it is above ATR stop", () => {
      const r = calculateStopLoss("long", 100, base());
      // ATR stop = 100 - 4 = 96
      // support = 95, support stop = 95 * 0.995 = 94.525
      // max(96, 94.525) = 96
      expect(r).toBe(96);
    });

    it("prefers ATR stop when support is far below", () => {
      const r = calculateStopLoss("long", 100, base({ supportLevels: [80] }));
      // ATR stop = 96, support stop = 80 * 0.995 = 79.6
      // max(96, 79.6) = 96
      expect(r).toBe(96);
    });

    it("never goes below 0", () => {
      const r = calculateStopLoss("long", 3, base({ atr: 10 }));
      // ATR stop = 3 - 20 = -17 → max(-17, 0) = 0
      expect(r).toBe(0);
    });
  });

  describe("SHORT", () => {
    it("uses ATR-based stop when no resistance above entry", () => {
      const r = calculateStopLoss("short", 100, base({ resistanceLevels: [95] }));
      // 100 + 2*2 = 104
      expect(r).toBe(104);
    });

    it("uses resistance-based stop when it is below ATR stop", () => {
      const r = calculateStopLoss("short", 100, base());
      // ATR stop = 100 + 4 = 104
      // resistance = 105, resistance stop = 105 * 1.005 = 105.525
      // min(104, 105.525) = 104
      expect(r).toBe(104);
    });

    it("prefers ATR stop when resistance is far above", () => {
      const r = calculateStopLoss("short", 100, base({ resistanceLevels: [130] }));
      // ATR stop = 104, resistance stop = 130 * 1.005 = 130.65
      // min(104, 130.65) = 104
      expect(r).toBe(104);
    });
  });
});

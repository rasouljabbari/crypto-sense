import { describe, it, expect } from "vitest";
import { calculateRisk } from "../risk/engine";
import type { RiskInput } from "../risk/types";

function makeInput(overrides?: Partial<RiskInput>): RiskInput {
  return {
    atr: { value: 2 },
    adx: { adx: 20, plusDI: 25, minusDI: 20, trend: "ranging" },
    volatility: { value: 30, annualized: 50, label: "medium" },
    support: { levels: [] },
    resistance: { levels: [] },
    currentPrice: 100,
    ...overrides,
  };
}

describe("Risk Engine", () => {
  // ── ATR ────────────────────────────────────────────────────────
  describe("ATR contribution", () => {
    it("adds +30 when ATR < 1% of price", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 0.5 } }));
      expect(r.riskScore).toBe(70); // 50 + 30 + 0 + 0 - 10 = 70
    });

    it("adds +15 when ATR 1-2% of price", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 1.5 } }));
      expect(r.riskScore).toBe(55); // 50 + 15 + 0 + 0 - 10 = 55
    });

    it("adds 0 when ATR 2-3% of price", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 2.5 } }));
      expect(r.riskScore).toBe(40); // 50 + 0 + 0 + 0 - 10 = 40
    });

    it("adds -15 when ATR 3-5% of price", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 4 } }));
      expect(r.riskScore).toBe(25); // 50 - 15 + 0 + 0 - 10 = 25
    });

    it("adds -30 when ATR >= 5% of price", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 6 } }));
      expect(r.riskScore).toBe(10); // 50 - 30 + 0 + 0 - 10 = 10
    });
  });

  // ── ADX ────────────────────────────────────────────────────────
  describe("ADX contribution", () => {
    it("adds +15 when ADX >= 50", () => {
      const r = calculateRisk(makeInput({ adx: { adx: 55, plusDI: 30, minusDI: 20, trend: "strong" } }));
      expect(r.riskScore).toBe(65); // 50 + 0 + 15 + 0 + 0 = 65
    });

    it("adds +5 when ADX 25-50", () => {
      const r = calculateRisk(makeInput({ adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" } }));
      expect(r.riskScore).toBe(55); // 50 + 0 + 5 + 0 + 0 = 55
    });

    it("subtracts -10 when ADX < 25", () => {
      const r = calculateRisk(makeInput());
      expect(r.riskScore).toBe(40); // 50 + 0 + (-10) + 0 + 0 = 40
    });
  });

  // ── Volatility ─────────────────────────────────────────────────
  describe("Volatility contribution", () => {
    it("adds +10 when low", () => {
      const r = calculateRisk(makeInput({
        volatility: { value: 10, annualized: 15, label: "low" },
      }));
      expect(r.riskScore).toBe(50); // 50 + 0 + (-10) + 10 + 0 = 50
    });

    it("adds 0 when medium", () => {
      const r = calculateRisk(makeInput());
      expect(r.riskScore).toBe(40); // 50 + 0 + (-10) + 0 + 0 = 40
    });

    it("subtracts -10 when high", () => {
      const r = calculateRisk(makeInput({
        volatility: { value: 60, annualized: 100, label: "high" },
      }));
      expect(r.riskScore).toBe(30); // 50 + 0 + (-10) + (-10) + 0 = 30
    });

    it("subtracts -20 when extreme", () => {
      const r = calculateRisk(makeInput({
        volatility: { value: 80, annualized: 150, label: "extreme" },
      }));
      expect(r.riskScore).toBe(20); // 50 + 0 + (-10) + (-20) + 0 = 20
    });
  });

  // ── Support / Resistance ───────────────────────────────────────
  describe("S/R distance contribution", () => {
    it("adds +10 when nearest level > 5% away", () => {
      const r = calculateRisk(makeInput({
        support: { levels: [80] },
        resistance: { levels: [120] },
      }));
      // closestLevel = 80, dist = |80-100|/100 = 0.20 >= 0.05 → +10
      expect(r.riskScore).toBe(50); // 50 + 0 + (-10) + 0 + 10 = 50
    });

    it("adds +5 when nearest level 2-5% away", () => {
      const r = calculateRisk(makeInput({
        support: { levels: [97] },
      }));
      // dist = |97-100|/100 = 0.03 → 2-5% → +5
      expect(r.riskScore).toBe(45); // 50 + 0 + (-10) + 0 + 5 = 45
    });

    it("subtracts -10 when nearest level < 2% away", () => {
      const r = calculateRisk(makeInput({
        support: { levels: [99.5] },
      }));
      // dist = |99.5-100|/100 = 0.005 < 0.02 → -10
      expect(r.riskScore).toBe(30); // 50 + 0 + (-10) + 0 + (-10) = 30
    });

    it("returns 0 when no S/R levels exist", () => {
      const r = calculateRisk(makeInput());
      expect(r.riskScore).toBe(40); // no SR contribution
    });
  });

  // ── Risk Level ─────────────────────────────────────────────────
  describe("Risk Level", () => {
    it("very_low when score >= 80", () => {
      expect(calculateRisk(makeInput({ atr: { value: 0.5 }, adx: { adx: 55, plusDI: 30, minusDI: 20, trend: "strong" }, volatility: { value: 10, annualized: 15, label: "low" } })).riskLevel).toBe("very_low");
    });

    it("low when score 60-79", () => {
      // 50 + 15 (ATR 1.5%) + 5 (ADX 30) + 0 + 0 = 70
      expect(calculateRisk(makeInput({ atr: { value: 1.5 }, adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" } })).riskLevel).toBe("low");
    });

    it("medium when score 40-59", () => {
      expect(calculateRisk(makeInput()).riskLevel).toBe("medium");
    });

    it("high when score 20-39", () => {
      // 50 + (-15) (ATR 4%) + 0 + (-10) (ADX <25) + 0 = 25
      expect(calculateRisk(makeInput({ atr: { value: 4 } })).riskLevel).toBe("high");
    });

    it("extreme when score < 20", () => {
      expect(calculateRisk(makeInput({ atr: { value: 6 } })).riskLevel).toBe("extreme");
    });
  });

  // ── Suggested Stop Loss ────────────────────────────────────────
  describe("Suggested Stop Loss", () => {
    it("uses ATR-based stop when no support levels", () => {
      const r = calculateRisk(makeInput({ currentPrice: 100, atr: { value: 3 } }));
      expect(r.suggestedStopLoss).toBe(94); // 100 - 3 * 2 = 94
    });

    it("uses support-based stop when it is above ATR stop", () => {
      const r = calculateRisk(makeInput({
        currentPrice: 100,
        atr: { value: 5 },
        support: { levels: [95] },
      }));
      // ATR stop = 100 - 5*2 = 90
      // support stop = 95 * 0.995 = 94.525
      // max(90, 94.525) = 94.525
      expect(r.suggestedStopLoss).toBeCloseTo(94.525, 3);
    });

    it("uses ATR-based stop when support is below ATR stop", () => {
      const r = calculateRisk(makeInput({
        currentPrice: 100,
        atr: { value: 2 },
        support: { levels: [80] },
      }));
      // ATR stop = 100 - 2*2 = 96
      // support stop = 80 * 0.995 = 79.6
      // max(96, 79.6) = 96
      expect(r.suggestedStopLoss).toBe(96);
    });

    it("never goes below 0", () => {
      const r = calculateRisk(makeInput({
        currentPrice: 1,
        atr: { value: 10 },
      }));
      expect(r.suggestedStopLoss).toBe(0); // 1 - 20 = -19 → max(0, -19) = 0
    });
  });

  // ── Risk Percentage ────────────────────────────────────────────
  describe("Risk Percentage", () => {
    it("2% when riskScore >= 80", () => {
      expect(calculateRisk(makeInput({ atr: { value: 0.5 }, adx: { adx: 55, plusDI: 30, minusDI: 20, trend: "strong" }, volatility: { value: 10, annualized: 15, label: "low" } })).riskPercentage).toBe(2);
    });

    it("1.5% when riskScore 60-79", () => {
      // 50 + 15 (ATR 1.5%) + 5 (ADX 30) + 0 + 0 = 70
      expect(calculateRisk(makeInput({ atr: { value: 1.5 }, adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" } })).riskPercentage).toBe(1.5);
    });

    it("1% when riskScore 40-59", () => {
      expect(calculateRisk(makeInput()).riskPercentage).toBe(1);
    });

    it("0.5% when riskScore 20-39", () => {
      // 50 + (-15) (ATR 4%) + 0 + (-10) (ADX <25) + 0 = 25
      expect(calculateRisk(makeInput({ atr: { value: 4 } })).riskPercentage).toBe(0.5);
    });

    it("0.25% when riskScore < 20", () => {
      expect(calculateRisk(makeInput({ atr: { value: 6 } })).riskPercentage).toBe(0.25);
    });
  });

  // ── Edge Cases ─────────────────────────────────────────────────
  describe("Edge Cases", () => {
    it("handles zero or negative price gracefully", () => {
      const r = calculateRisk(makeInput({ currentPrice: 0 }));
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
      expect(r.riskScore).toBeLessThanOrEqual(100);
    });

    it("handles NaN ATR gracefully", () => {
      const r = calculateRisk(makeInput({ atr: { value: NaN } }));
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});

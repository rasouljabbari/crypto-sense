import { describe, it, expect } from "vitest";
import { validateSetup } from "../validation-engine";
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

describe("Validation Engine", () => {
  it("passes a valid long setup", () => {
    const r = validateSetup("long", 100, 96, 4, 110, 85, base());
    expect(r.isValid).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("rejects when entry <= stopLoss for long", () => {
    const r = validateSetup("long", 95, 100, 5, 105, 85, base());
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("above stop loss");
  });

  it("rejects when entry >= stopLoss for short", () => {
    const r = validateSetup("short", 100, 95, 5, 90, 85, base());
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("below stop loss");
  });

  it("rejects when trend is neutral", () => {
    const r = validateSetup("long", 100, 96, 4, 110, 85, base({ trendDirection: "neutral" }));
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("Trend is unclear");
  });

  it("rejects when trade quality is below minimum", () => {
    const r = validateSetup("long", 100, 96, 4, 110, 30, base());
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("below minimum");
  });

  it("rejects when risk reward is below 1:2", () => {
    const r = validateSetup("long", 100, 99, 1, 101, 85, base());
    // R:R = |101-100|/1 = 1, which is < 2
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("below minimum");
  });

  it("rejects when entry is invalid (zero)", () => {
    const r = validateSetup("long", 0, 96, 4, 110, 85, base());
    expect(r.isValid).toBe(false);
  });

  it("rejects when stop loss is invalid (zero)", () => {
    const r = validateSetup("long", 100, 0, 4, 110, 85, base());
    expect(r.isValid).toBe(false);
  });

  it("rejects when risk is zero", () => {
    const r = validateSetup("long", 100, 100, 0, 110, 85, base());
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("greater than zero");
  });

  it("rejects when no S/R levels available", () => {
    const r = validateSetup("long", 100, 96, 4, 110, 85, base({
      supportLevels: [],
      resistanceLevels: [],
    }));
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("Support and resistance");
  });

  it("passes a valid short setup", () => {
    const r = validateSetup("short", 100, 104, 4, 92, 85, base({ trendDirection: "bearish" }));
    expect(r.isValid).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("collects multiple failure reasons", () => {
    const r = validateSetup("long", 0, 0, 0, 0, 30, base({
      trendDirection: "neutral",
      supportLevels: [],
      resistanceLevels: [],
    }));
    expect(r.isValid).toBe(false);
    expect(r.reason).toContain("Entry");
    expect(r.reason).toContain("Stop loss");
    expect(r.reason).toContain("Trend is unclear");
  });
});

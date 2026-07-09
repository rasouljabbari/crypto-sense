import { describe, it, expect } from "vitest";
import { calculateExpectedProfit } from "../expected-profit-engine";

describe("Expected Profit Engine", () => {
  describe("LONG", () => {
    it("calculates profit for each TP level", () => {
      const r = calculateExpectedProfit("long", 100, { tp1: 110, tp2: 115, tp3: 125 }, 20);
      expect(r.tp1).toBe(200);  // (110-100)*20
      expect(r.tp2).toBe(300);  // (115-100)*20
      expect(r.tp3).toBe(500);  // (125-100)*20
    });
  });

  describe("SHORT", () => {
    it("calculates profit for each TP level", () => {
      const r = calculateExpectedProfit("short", 100, { tp1: 90, tp2: 85, tp3: 75 }, 20);
      expect(r.tp1).toBe(200);  // (100-90)*20
      expect(r.tp2).toBe(300);  // (100-85)*20
      expect(r.tp3).toBe(500);  // (100-75)*20
    });
  });

  it("returns zero when position size is zero", () => {
    const r = calculateExpectedProfit("long", 100, { tp1: 110, tp2: 115, tp3: 125 }, 0);
    expect(r.tp1).toBe(0);
    expect(r.tp2).toBe(0);
    expect(r.tp3).toBe(0);
  });

  it("returns zero when position size is negative", () => {
    const r = calculateExpectedProfit("long", 100, { tp1: 110, tp2: 115, tp3: 125 }, -1);
    expect(r.tp1).toBe(0);
    expect(r.tp2).toBe(0);
    expect(r.tp3).toBe(0);
  });
});

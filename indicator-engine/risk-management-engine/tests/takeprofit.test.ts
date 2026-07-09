import { describe, it, expect } from "vitest";
import { calculateTakeProfit } from "../takeprofit-engine";

describe("Take Profit Engine", () => {
  describe("LONG", () => {
    it("calculates TP levels with correct R:R ratios", () => {
      const r = calculateTakeProfit("long", 100, 5);
      expect(r.tp1).toBe(110); // 100 + 5*2
      expect(r.tp2).toBe(115); // 100 + 5*3
      expect(r.tp3).toBe(125); // 100 + 5*5
    });

    it("handles zero risk", () => {
      const r = calculateTakeProfit("long", 100, 0);
      expect(r.tp1).toBe(100);
      expect(r.tp2).toBe(100);
      expect(r.tp3).toBe(100);
    });

    it("handles fractional prices", () => {
      const r = calculateTakeProfit("long", 99.5, 2.25);
      // tp1 = 99.5 + 2.25*2 = 104
      expect(r.tp1).toBe(104);
      // tp2 = 99.5 + 2.25*3 = 106.25
      expect(r.tp2).toBe(106.25);
      // tp3 = 99.5 + 2.25*5 = 110.75
      expect(r.tp3).toBe(110.75);
    });
  });

  describe("SHORT", () => {
    it("calculates TP levels with correct R:R ratios", () => {
      const r = calculateTakeProfit("short", 100, 5);
      expect(r.tp1).toBe(90);  // 100 - 5*2
      expect(r.tp2).toBe(85);  // 100 - 5*3
      expect(r.tp3).toBe(75);  // 100 - 5*5
    });

    it("handles zero risk", () => {
      const r = calculateTakeProfit("short", 100, 0);
      expect(r.tp1).toBe(100);
      expect(r.tp2).toBe(100);
      expect(r.tp3).toBe(100);
    });
  });
});

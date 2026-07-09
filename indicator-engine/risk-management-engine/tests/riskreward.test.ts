import { describe, it, expect } from "vitest";
import { calculateRiskReward } from "../riskreward-engine";

describe("Risk/Reward Engine", () => {
  it("returns fixed ratios 2, 3, 5", () => {
    const r = calculateRiskReward();
    expect(r.tp1).toBe(2);
    expect(r.tp2).toBe(3);
    expect(r.tp3).toBe(5);
  });

  it("always returns the same result (deterministic)", () => {
    const a = calculateRiskReward();
    const b = calculateRiskReward();
    expect(a).toEqual(b);
  });
});

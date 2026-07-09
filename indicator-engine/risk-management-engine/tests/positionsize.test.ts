import { describe, it, expect } from "vitest";
import { calculatePositionSize } from "../position-size-engine";

describe("Position Size Engine", () => {
  it("calculates position size correctly", () => {
    const r = calculatePositionSize(10000, 5, 1);
    expect(r.accountBalance).toBe(10000);
    expect(r.riskPercent).toBe(1);
    expect(r.riskAmount).toBe(100); // 10000 * 0.01
    expect(r.positionSize).toBe(20); // 100 / 5
  });

  it("uses default risk percent when not provided", () => {
    const r = calculatePositionSize(10000, 5);
    expect(r.riskPercent).toBe(1);
    expect(r.riskAmount).toBe(100);
    expect(r.positionSize).toBe(20);
  });

  it("clamps risk percent to min/max", () => {
    const low = calculatePositionSize(10000, 5, 0.01);
    expect(low.riskPercent).toBe(0.1); // clamped to MIN_RISK_PERCENT

    const high = calculatePositionSize(10000, 5, 10);
    expect(high.riskPercent).toBe(5);
  });

  it("returns zero position size when risk is zero", () => {
    const r = calculatePositionSize(10000, 0, 1);
    expect(r.positionSize).toBe(0);
    expect(r.riskAmount).toBe(100);
  });

  it("handles fractional account balance", () => {
    const r = calculatePositionSize(1234.56, 2.5, 2);
    expect(r.riskAmount).toBe(24.69); // 1234.56 * 0.02
    expect(r.positionSize).toBe(9.876); // 24.69 / 2.5
  });
});

import { describe, it, expect } from "vitest";
import { atr } from "../indicators/atr";

describe("atr", () => {
  it("returns ATR of 4 for a flat market with 4pt range", () => {
    const highs = Array.from({ length: 40 }, () => 102);
    const lows = Array.from({ length: 40 }, () => 98);
    const closes = Array.from({ length: 40 }, () => 100);
    const result = atr(highs, lows, closes);
    expect(result.value).toBe(4);
  });

  it("returns a positive value for volatile market", () => {
    const highs = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 20);
    const lows = Array.from({ length: 30 }, (_, i) => 80 + Math.sin(i) * 10);
    const closes = Array.from({ length: 30 }, (_, i) => 90 + Math.sin(i) * 15);
    const result = atr(highs, lows, closes);
    expect(result.value).toBeGreaterThan(0);
  });

  it("returns 0 for insufficient data", () => {
    const result = atr([100], [90], [95], 14);
    expect(result.value).toBe(0);
  });

  it("uses default period 14", () => {
    const highs = Array.from({ length: 30 }, (_, i) => 100 + i);
    const lows = Array.from({ length: 30 }, (_, i) => 90 + i);
    const closes = Array.from({ length: 30 }, (_, i) => 95 + i);
    const result = atr(highs, lows, closes);
    expect(result.value).toBeGreaterThan(0);
  });

  it("handles empty arrays", () => {
    const result = atr([], [], []);
    expect(result.value).toBe(0);
  });
});

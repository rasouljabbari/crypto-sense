import { describe, it, expect } from "vitest";
import { adx } from "../indicators/adx";

describe("adx", () => {
  it("returns ranging for insufficient data", () => {
    const result = adx([1, 2, 3], [0, 1, 2], [0.5, 1, 2], 14);
    expect(result.adx).toBe(0);
    expect(result.trend).toBe("ranging");
  });

  it("returns positive ADX for a trending market", () => {
    const length = 60;
    const highs = Array.from({ length }, (_, i) => 100 + i * 2 + Math.sin(i) * 5);
    const lows = Array.from({ length }, (_, i) => 95 + i * 2 + Math.sin(i) * 3);
    const closes = Array.from({ length }, (_, i) => 97 + i * 2 + Math.sin(i) * 4);

    const result = adx(highs, lows, closes, 14);
    expect(result.adx).toBeGreaterThan(0);
    expect(result.plusDI).toBeGreaterThan(0);
    expect(result.minusDI).toBeGreaterThan(0);
  });

  it("returns DI values as percentages", () => {
    const length = 60;
    const highs = Array.from({ length }, (_, i) => 100 + i);
    const lows = Array.from({ length }, (_, i) => 90 + i);
    const closes = Array.from({ length }, (_, i) => 95 + i);

    const result = adx(highs, lows, closes, 14);
    expect(result.plusDI).toBeGreaterThanOrEqual(0);
    expect(result.plusDI).toBeLessThanOrEqual(100);
  });

  it("handles empty arrays", () => {
    const result = adx([], [], []);
    expect(result.adx).toBe(0);
    expect(result.trend).toBe("ranging");
  });
});

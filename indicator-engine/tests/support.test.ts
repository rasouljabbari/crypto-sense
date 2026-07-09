import { describe, it, expect } from "vitest";
import { support } from "../indicators/support";

describe("support", () => {
  it("returns support levels below current price", () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + Math.sin(i * 0.5) * 10);
    const lows = Array.from({ length: 50 }, (_, i) => 90 + Math.sin(i * 0.5) * 10);
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);

    const result = support(highs, lows, closes);
    expect(result.levels.length).toBeGreaterThan(0);
    expect(result.levels.every((l) => l < closes[closes.length - 1])).toBe(true);
  });

  it("returns empty for insufficient data", () => {
    const result = support([1, 2], [0, 1], [0.5]);
    expect(result.levels).toEqual([]);
  });

  it("all levels are below the last close", () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + Math.sin(i) * 5);
    const lows = Array.from({ length: 50 }, (_, i) => 90 + Math.sin(i) * 5);
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 5);

    const result = support(highs, lows, closes);
    const lastClose = closes[closes.length - 1];
    for (const level of result.levels) {
      expect(level).toBeLessThan(lastClose);
    }
  });

  it("handles empty arrays", () => {
    const result = support([], [], []);
    expect(result.levels).toEqual([]);
  });
});

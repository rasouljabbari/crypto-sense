import { describe, it, expect } from "vitest";
import { resistance } from "../indicators/resistance";

describe("resistance", () => {
  it("returns resistance levels above current price", () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + Math.sin(i * 0.5) * 10);
    const lows = Array.from({ length: 50 }, (_, i) => 90 + Math.sin(i * 0.5) * 10);
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);

    const result = resistance(highs, lows, closes);
    expect(result.levels.length).toBeGreaterThan(0);
    expect(result.levels.every((l) => l > closes[closes.length - 1])).toBe(true);
  });

  it("returns empty for insufficient data", () => {
    const result = resistance([1, 2], [0, 1], [0.5]);
    expect(result.levels).toEqual([]);
  });

  it("returns levels sorted by proximity to price (closest first)", () => {
    const highs = Array.from({ length: 50 }, (_, i) => 110 + Math.sin(i) * 5);
    const lows = Array.from({ length: 50 }, (_, i) => 90 + Math.sin(i) * 5);
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 5);

    const result = resistance(highs, lows, closes);
    if (result.levels.length >= 2) {
      const lastClose = closes[closes.length - 1];
      const distances = result.levels.map((l) => l - lastClose);
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    }
  });

  it("handles empty arrays", () => {
    const result = resistance([], [], []);
    expect(result.levels).toEqual([]);
  });
});

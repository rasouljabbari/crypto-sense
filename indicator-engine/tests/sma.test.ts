import { describe, it, expect } from "vitest";
import { sma } from "../indicators/sma";

describe("sma", () => {
  it("returns the correct SMA value for a known sequence", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = sma(values, 5);
    expect(result.period).toBe(5);
    expect(result.value).toBe(8);
    expect(result.values.filter(Number.isFinite).length).toBeGreaterThan(0);
  });

  it("returns 0 for insufficient data", () => {
    const result = sma([1, 2, 3], 10);
    expect(result.value).toBe(0);
    expect(result.values).toEqual([]);
  });

  it("returns 0 for period <= 0", () => {
    const result = sma([1, 2, 3], 0);
    expect(result.value).toBe(0);
  });

  it("handles constant values", () => {
    const result = sma([5, 5, 5, 5, 5], 3);
    expect(result.value).toBe(5);
  });

  it("handles empty array", () => {
    const result = sma([], 10);
    expect(result.value).toBe(0);
  });

  it("uses default period 20", () => {
    const values = Array.from({ length: 25 }, (_, i) => i + 1);
    const result = sma(values);
    expect(result.period).toBe(20);
  });
});

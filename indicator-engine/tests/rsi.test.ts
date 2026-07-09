import { describe, it, expect } from "vitest";
import { rsi } from "../indicators/rsi";

describe("rsi", () => {
  it("returns 100 when all closes go up", () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(values, 14);
    expect(result.value).toBe(100);
    expect(result.overbought).toBe(true);
    expect(result.oversold).toBe(false);
  });

  it("returns 0 when all closes go down", () => {
    const values = Array.from({ length: 30 }, (_, i) => 200 - i);
    const result = rsi(values, 14);
    expect(result.value).toBe(0);
    expect(result.oversold).toBe(true);
    expect(result.overbought).toBe(false);
  });

  it("returns 50 for insufficient data", () => {
    const result = rsi([50, 51], 14);
    expect(result.value).toBe(50);
    expect(result.oversold).toBe(false);
    expect(result.overbought).toBe(false);
  });

  it("uses default period 14", () => {
    const values = Array.from({ length: 20 }, (_, i) => i);
    const result = rsi(values);
    expect(result.value).toBeGreaterThanOrEqual(0);
  });

  it("handles empty array", () => {
    const result = rsi([]);
    expect(result.value).toBe(50);
    expect(result.oversold).toBe(false);
    expect(result.overbought).toBe(false);
  });
});

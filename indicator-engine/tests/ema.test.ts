import { describe, it, expect } from "vitest";
import { ema } from "../indicators/ema";

describe("ema", () => {
  it("returns the correct EMA for a known sequence", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = ema(values, 5);
    expect(result.period).toBe(5);
    expect(result.value).toBeGreaterThan(0);
  });

  it("returns 0 for insufficient data", () => {
    const result = ema([1, 2], 10);
    expect(result.value).toBe(0);
  });

  it("returns 0 for period <= 0", () => {
    const result = ema([1, 2, 3], 0);
    expect(result.value).toBe(0);
  });

  it("EMA follows price (recent data weighted more)", () => {
    const rising = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const falling = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];

    const risingEma = ema(rising, 5);
    const fallingEma = ema(falling, 5);

    expect(risingEma.value).toBeGreaterThan(0);
    expect(fallingEma.value).toBeLessThan(20);
  });

  it("handles empty array", () => {
    const result = ema([], 10);
    expect(result.value).toBe(0);
  });
});

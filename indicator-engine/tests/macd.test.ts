import { describe, it, expect } from "vitest";
import { macd } from "../indicators/macd";

describe("macd", () => {
  it("returns bullish=true when macd histogram is positive", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + i * i * 0.02);
    const result = macd(values);
    expect(result.value).toBeGreaterThan(0);
    expect(result.bullish).toBe(true);
  });

  it("returns bullish=false when fast EMA < slow EMA", () => {
    const values = Array.from({ length: 60 }, (_, i) => 200 - i * 2);
    const result = macd(values);
    expect(result.value).toBeLessThan(0);
    expect(result.bullish).toBe(false);
  });

  it("returns zeros for insufficient data", () => {
    const result = macd([1, 2, 3], 12, 26, 9);
    expect(result.value).toBe(0);
    expect(result.signal).toBe(0);
    expect(result.histogram).toBe(0);
    expect(result.bullish).toBe(false);
  });

  it("handles empty array", () => {
    const result = macd([]);
    expect(result.value).toBe(0);
    expect(result.bullish).toBe(false);
  });
});

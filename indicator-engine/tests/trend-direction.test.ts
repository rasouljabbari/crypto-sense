import { describe, it, expect } from "vitest";
import { trendDirection } from "../indicators/trend-direction";

describe("trendDirection", () => {
  it("returns bullish when short EMA > long EMA and price rising", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i);
    const emaShort = Array.from({ length: 50 }, (_, i) => 95 + i);
    const emaLong = Array.from({ length: 50 }, (_, i) => 90 + i);
    const result = trendDirection(closes, emaShort, emaLong);
    expect(result.direction).toBe("bullish");
  });

  it("returns bearish when short EMA < long EMA and price falling", () => {
    const closes = Array.from({ length: 50 }, (_, i) => 200 - i);
    const emaShort = Array.from({ length: 50 }, (_, i) => 195 - i);
    const emaLong = Array.from({ length: 50 }, (_, i) => 200 - i);
    const result = trendDirection(closes, emaShort, emaLong);
    expect(result.direction).toBe("bearish");
  });

  it("returns neutral for insufficient data", () => {
    const result = trendDirection([100], [95], [90]);
    expect(result.direction).toBe("neutral");
  });

  it("returns neutral when signals are mixed", () => {
    const closes = [100, 99, 100, 101, 102, 101, 100, 101, 102, 101];
    const emaShort = [99, 98, 98, 99, 100, 101, 102, 102, 101, 100];
    const emaLong = [100, 99, 99, 99, 99, 99, 100, 100, 100, 100];
    const result = trendDirection(closes, emaShort, emaLong);
    expect(result.direction).toBe("neutral");
  });

  it("handles empty arrays", () => {
    const result = trendDirection([], [], []);
    expect(result.direction).toBe("neutral");
  });
});

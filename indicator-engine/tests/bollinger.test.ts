import { describe, it, expect } from "vitest";
import { bollingerBands } from "../indicators/bollinger";

describe("bollingerBands", () => {
  it("returns upper > middle > lower for normal data", () => {
    const values = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 10);
    const result = bollingerBands(values);
    expect(result.upper).toBeGreaterThan(result.middle);
    expect(result.middle).toBeGreaterThan(result.lower);
    expect(result.width).toBeGreaterThan(0);
  });

  it("returns inside when close is within bands", () => {
    const values = Array.from({ length: 25 }, () => 100);
    const result = bollingerBands(values);
    expect(result.pricePosition).toBe("inside");
  });

  it("returns zeros for insufficient data", () => {
    const result = bollingerBands([1, 2, 3], 20);
    expect(result.upper).toBe(0);
    expect(result.middle).toBe(0);
    expect(result.lower).toBe(0);
    expect(result.pricePosition).toBe("inside");
  });

  it("uses default period 20 and stdDev 2", () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 + i);
    const result = bollingerBands(values);
    expect(result.middle).toBeGreaterThan(0);
    expect(result.upper).toBeGreaterThan(result.middle);
  });

  it("handles empty array", () => {
    const result = bollingerBands([]);
    expect(result.upper).toBe(0);
    expect(result.pricePosition).toBe("inside");
  });
});

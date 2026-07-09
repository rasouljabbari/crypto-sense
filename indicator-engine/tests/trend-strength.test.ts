import { describe, it, expect } from "vitest";
import { trendStrength } from "../indicators/trend-strength";

describe("trendStrength", () => {
  it("returns strong for ADX >= 50", () => {
    expect(trendStrength(50).label).toBe("strong");
    expect(trendStrength(75).label).toBe("strong");
    expect(trendStrength(100).label).toBe("strong");
  });

  it("returns moderate for ADX between 25 and 50", () => {
    expect(trendStrength(25).label).toBe("moderate");
    expect(trendStrength(30).label).toBe("moderate");
    expect(trendStrength(49).label).toBe("moderate");
  });

  it("returns weak for ADX < 25", () => {
    expect(trendStrength(0).label).toBe("weak");
    expect(trendStrength(10).label).toBe("weak");
    expect(trendStrength(24).label).toBe("weak");
  });

  it("clamps ADX to 0-100 range", () => {
    expect(trendStrength(-10).value).toBe(0);
    expect(trendStrength(150).value).toBe(100);
  });

  it("rounds the value", () => {
    const result = trendStrength(25.678);
    expect(result.value).toBe(25.68);
  });
});

import { describe, it, expect } from "vitest";
import { obv } from "../indicators/obv";

describe("obv", () => {
  it("returns rising when price increases", () => {
    const closes = [100, 102, 104, 106, 108, 110];
    const volumes = [1000, 1000, 1000, 1000, 1000, 1000];
    const result = obv(closes, volumes);
    expect(result.trend).toBe("rising");
    expect(result.value).toBeGreaterThan(0);
  });

  it("returns falling when price decreases", () => {
    const closes = [110, 108, 106, 104, 102, 100];
    const volumes = [1000, 1000, 1000, 1000, 1000, 1000];
    const result = obv(closes, volumes);
    expect(result.trend).toBe("falling");
    expect(result.value).toBeLessThan(0);
  });

  it("returns flat for insufficient data", () => {
    const result = obv([100], [1000]);
    expect(result.value).toBe(0);
    expect(result.trend).toBe("flat");
  });

  it("accumulates volume correctly", () => {
    const closes = [100, 105, 100, 105, 100, 105];
    const volumes = [100, 200, 300, 400, 500, 600];
    const result = obv(closes, volumes);
    const expected = 0 + 200 - 300 + 400 - 500 + 600;
    expect(result.value).toBe(expected);
  });

  it("handles empty arrays", () => {
    const result = obv([], []);
    expect(result.value).toBe(0);
    expect(result.trend).toBe("flat");
  });
});

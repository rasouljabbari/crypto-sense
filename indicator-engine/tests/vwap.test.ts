import { describe, it, expect } from "vitest";
import { vwap } from "../indicators/vwap";

describe("vwap", () => {
  it("returns the VWAP for a known sequence", () => {
    const highs = [110, 120, 130];
    const lows = [90, 100, 110];
    const closes = [100, 110, 120];
    const volumes = [1000, 2000, 3000];

    const result = vwap(highs, lows, closes, volumes);

    const tp1 = (110 + 90 + 100) / 3;
    const tp2 = (120 + 100 + 110) / 3;
    const tp3 = (130 + 110 + 120) / 3;
    const expected = (tp1 * 1000 + tp2 * 2000 + tp3 * 3000) / (1000 + 2000 + 3000);

    expect(result.value).toBeCloseTo(expected, 1);
  });

  it("returns 0 for empty arrays", () => {
    const result = vwap([], [], [], []);
    expect(result.value).toBe(0);
  });

  it("returns 0 for zero volumes", () => {
    const result = vwap([100], [90], [95], [0]);
    expect(result.value).toBe(0);
  });

  it("handles single valid bar", () => {
    const result = vwap([110], [90], [100], [500]);
    expect(result.value).toBeCloseTo(100, 1);
  });

  it("skips invalid bars", () => {
    const result = vwap([NaN, 110], [NaN, 90], [NaN, 100], [0, 500]);
    expect(result.value).toBeGreaterThan(0);
  });
});

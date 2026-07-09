import { describe, it, expect } from "vitest";
import { volatility } from "../indicators/volatility";

describe("volatility", () => {
  it("returns low volatility for a flat price series", () => {
    const closes = Array.from({ length: 30 }, () => 100);
    const result = volatility(closes);
    expect(result.value).toBe(0);
    expect(result.annualized).toBe(0);
    expect(result.label).toBe("low");
  });

  it("returns higher volatility for erratic price movements", () => {
    const erratic = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i) * 20);
    const stable = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 2);

    const erraticVol = volatility(erratic);
    const stableVol = volatility(stable);

    expect(erraticVol.value).toBeGreaterThan(stableVol.value);
  });

  it("returns 0 for insufficient data", () => {
    const result = volatility([100]);
    expect(result.value).toBe(0);
    expect(result.annualized).toBe(0);
    expect(result.label).toBe("low");
  });

  it("annualized volatility is higher than daily", () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = volatility(closes);
    expect(result.annualized).toBeGreaterThan(result.value);
  });

  it("handles empty array", () => {
    const result = volatility([]);
    expect(result.value).toBe(0);
    expect(result.annualized).toBe(0);
    expect(result.label).toBe("low");
  });

  it("uses default annualization factor of 252", () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i) * 5);
    const result = volatility(closes);
    expect(result.annualized).toBeGreaterThan(0);
  });
});

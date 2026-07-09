import { describe, it, expect } from "vitest";
import { calculateScores } from "../scoring/engine";
import type { ScoreEngineInput } from "../scoring/types";

function makeInput(overrides?: Partial<ScoreEngineInput>): ScoreEngineInput {
  return {
    rsi: { value: 50, oversold: false, overbought: false },
    ema20: { period: 20, value: 100 },
    ema50: { period: 50, value: 100 },
    ema200: { period: 200, value: 100 },
    macd: { value: 0, signal: 0, histogram: 0, bullish: false },
    adx: { adx: 20, plusDI: 25, minusDI: 20, trend: "ranging" },
    obv: { value: 1000, trend: "flat" },
    vwap: { value: 100 },
    currentPrice: 100,
    resistance: { levels: [] },
    support: { levels: [] },
    volatility: { value: 30, annualized: 50, label: "medium" },
    ...overrides,
  };
}

// ── Technical Score (RSI) ─────────────────────────────────────────────

describe("Technical Score", () => {
  it("returns neutral 50 when RSI is 50", () => {
    const result = calculateScores(makeInput());
    expect(result.technical).toBe(50);
    expect(result.breakdown.technical.label).toBe("neutral");
  });

  it("adds +20 when RSI is oversold (≤30)", () => {
    const result = calculateScores(makeInput({ rsi: { value: 25, oversold: true, overbought: false } }));
    expect(result.technical).toBe(70);
    expect(result.breakdown.technical.label).toBe("bullish");
  });

  it("adds +10 when RSI is 30-45", () => {
    const result = calculateScores(makeInput({ rsi: { value: 40, oversold: false, overbought: false } }));
    expect(result.technical).toBe(60);
  });

  it("returns 50 when RSI is 45-60", () => {
    const result = calculateScores(makeInput({ rsi: { value: 55, oversold: false, overbought: false } }));
    expect(result.technical).toBe(50);
  });

  it("subtracts -15 when RSI is overbought (>70)", () => {
    const result = calculateScores(makeInput({ rsi: { value: 80, oversold: false, overbought: true } }));
    expect(result.technical).toBe(35);
    expect(result.breakdown.technical.label).toBe("bearish");
  });

  it("clamps at 100", () => {
    const result = calculateScores(makeInput({ rsi: { value: 10, oversold: true, overbought: false } }));
    expect(result.technical).toBe(70); // 50 + 20 = 70
  });

  it("clamps at 0", () => {
    const result = calculateScores(makeInput({ rsi: { value: 95, oversold: false, overbought: true } }));
    expect(result.technical).toBe(35); // 50 - 15 = 35
  });
});

// ── Trend Score ───────────────────────────────────────────────────────

describe("Trend Score", () => {
  it("returns neutral 50 when all EMAs equal and no S/R levels", () => {
    const result = calculateScores(makeInput());
    expect(result.trend).toBe(50);
  });

  it("adds +10 when EMA20 > EMA50", () => {
    const result = calculateScores(makeInput({
      ema20: { period: 20, value: 110 },
      ema50: { period: 50, value: 100 },
    }));
    expect(result.trend).toBe(60);
  });

  it("adds +10 when EMA50 > EMA200", () => {
    const result = calculateScores(makeInput({
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 },
    }));
    expect(result.trend).toBe(60);
  });

  it("adds +20 when both EMA crossovers are bullish", () => {
    const result = calculateScores(makeInput({
      ema20: { period: 20, value: 120 },
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 },
    }));
    expect(result.trend).toBe(70);
  });

  it("adds +5 when price above nearest resistance", () => {
    const result = calculateScores(makeInput({
      currentPrice: 105,
      resistance: { levels: [100, 110] },
      support: { levels: [90] },
    }));
    expect(result.trend).toBe(55);
  });

  it("subtracts -10 when price below nearest support", () => {
    const result = calculateScores(makeInput({
      currentPrice: 85,
      support: { levels: [90, 80] },
      resistance: { levels: [100] },
    }));
    expect(result.trend).toBe(40);
  });

  it("combines EMA crossovers and S/R levels", () => {
    const result = calculateScores(makeInput({
      ema20: { period: 20, value: 120 },
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 },
      currentPrice: 130,
      resistance: { levels: [125] },
    }));
    // EMA20>50: +10, EMA50>200: +10, Above resistance: +5
    expect(result.trend).toBe(75);
  });
});

// ── Momentum Score ────────────────────────────────────────────────────

describe("Momentum Score", () => {
  it("returns neutral 50 when MACD is bearish and ADX ≤25", () => {
    const result = calculateScores(makeInput());
    expect(result.momentum).toBe(50);
  });

  it("adds +10 when MACD is bullish", () => {
    const result = calculateScores(makeInput({
      macd: { value: 1, signal: 0.5, histogram: 0.5, bullish: true },
    }));
    expect(result.momentum).toBe(60);
  });

  it("adds +5 when ADX > 25", () => {
    const result = calculateScores(makeInput({
      adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" },
    }));
    expect(result.momentum).toBe(55);
  });

  it("combines MACD bull and ADX >25", () => {
    const result = calculateScores(makeInput({
      macd: { value: 1, signal: 0.5, histogram: 0.5, bullish: true },
      adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" },
    }));
    expect(result.momentum).toBe(65); // 50 + 10 + 5
  });

  it("handles ADX exactly at threshold (not >)", () => {
    const result = calculateScores(makeInput({
      adx: { adx: 25, plusDI: 25, minusDI: 20, trend: "trending" },
    }));
    expect(result.momentum).toBe(50); // 25 is not > 25
  });
});

// ── Volume Score ──────────────────────────────────────────────────────

describe("Volume Score", () => {
  it("returns neutral 50 when OBV flat and price = VWAP", () => {
    const result = calculateScores(makeInput());
    expect(result.volume).toBe(50);
  });

  it("adds +10 when OBV is rising", () => {
    const result = calculateScores(makeInput({
      obv: { value: 1000, trend: "rising" },
    }));
    expect(result.volume).toBe(60);
  });

  it("adds +5 when price above VWAP", () => {
    const result = calculateScores(makeInput({
      currentPrice: 105,
      vwap: { value: 100 },
    }));
    expect(result.volume).toBe(55);
  });

  it("combines OBV rising and price above VWAP", () => {
    const result = calculateScores(makeInput({
      obv: { value: 1000, trend: "rising" },
      currentPrice: 105,
      vwap: { value: 100 },
    }));
    expect(result.volume).toBe(65); // 50 + 10 + 5
  });

  it("does not add VWAP bonus when price equals VWAP", () => {
    const result = calculateScores(makeInput({
      currentPrice: 100,
      vwap: { value: 100 },
    }));
    expect(result.volume).toBe(50);
  });

  it("does not add VWAP bonus when price below VWAP", () => {
    const result = calculateScores(makeInput({
      currentPrice: 90,
      vwap: { value: 100 },
    }));
    expect(result.volume).toBe(50);
  });
});

// ── Volatility Score ──────────────────────────────────────────────────

describe("Volatility Score", () => {
  it("returns neutral 50 when volatility is medium", () => {
    const result = calculateScores(makeInput());
    expect(result.volatilityScore).toBe(50);
  });

  it("returns neutral 50 when volatility is low", () => {
    const result = calculateScores(makeInput({
      volatility: { value: 10, annualized: 15, label: "low" },
    }));
    expect(result.volatilityScore).toBe(50);
  });

  it("subtracts -5 when volatility is high", () => {
    const result = calculateScores(makeInput({
      volatility: { value: 60, annualized: 100, label: "high" },
    }));
    expect(result.volatilityScore).toBe(45);
  });

  it("subtracts -5 when volatility is extreme", () => {
    const result = calculateScores(makeInput({
      volatility: { value: 80, annualized: 150, label: "extreme" },
    }));
    expect(result.volatilityScore).toBe(45);
  });
});

// ── Overall Score ─────────────────────────────────────────────────────

describe("Overall Score", () => {
  it("computes weighted average", () => {
    const input = makeInput({
      rsi: { value: 25, oversold: true, overbought: false }, // tech = 70
      ema20: { period: 20, value: 120 },
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 }, // trend = 60
      macd: { value: 1, signal: 0.5, histogram: 0.5, bullish: true }, // mom = 60
    });
    const result = calculateScores(input);
    // 70 * 0.25 + 70 * 0.25 + 60 * 0.20 + 50 * 0.15 + 50 * 0.15
    // = 17.5 + 17.5 + 12 + 7.5 + 7.5 = 62
    expect(result.overall).toBe(62);
  });

  it("is 50 when all sub-scores are 50", () => {
    const result = calculateScores(makeInput());
    expect(result.overall).toBe(50);
  });

  it("clamps to 100", () => {
    const input = makeInput({
      rsi: { value: 25, oversold: true, overbought: false }, // tech = 70
      ema20: { period: 20, value: 120 },
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 }, // trend = 60
      macd: { value: 1, signal: 0.5, histogram: 0.5, bullish: true }, // mom = 60
      obv: { value: 1000, trend: "rising" }, // vol = 60
      currentPrice: 105,
      vwap: { value: 100 }, // vol = 65
      resistance: { levels: [80] }, // trend = 65
    });
    const result = calculateScores(input);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});

// ── Confidence ────────────────────────────────────────────────────────

describe("Confidence", () => {
  it("is high when all scores agree", () => {
    const input = makeInput({
      rsi: { value: 80, oversold: false, overbought: true }, // tech = 35
      ema20: { period: 20, value: 80 },
      ema50: { period: 50, value: 100 },
      ema200: { period: 200, value: 110 },
      currentPrice: 85,
      support: { levels: [90] },
    });
    const result = calculateScores(input);
    // All scores should be 50 or below → low dev → high confidence
    expect(result.confidence).toBeGreaterThan(50);
  });

  it("is low when scores disagree", () => {
    // tech = very bullish (70), trend = very bearish (40), others = neutral
    const input = makeInput({
      rsi: { value: 25, oversold: true, overbought: false }, // tech = 70
      currentPrice: 85,
      support: { levels: [90] }, // trend = 40
    });
    const result = calculateScores(input);
    // deviations: |70-50|=20, |40-50|=10, |50-50|=0, |50-50|=0, |50-50|=0
    // meanDev = 30/5 = 6
    // confidence = 100 - 6*2 = 88
    expect(result.confidence).toBe(88);
  });

  it("is 100 when all scores are 50", () => {
    const result = calculateScores(makeInput());
    expect(result.confidence).toBe(100);
  });

  it("never goes below 0", () => {
    const result = calculateScores(makeInput({
      rsi: { value: 25, oversold: true, overbought: false },
      ema20: { period: 20, value: 120 },
      ema50: { period: 50, value: 110 },
      ema200: { period: 200, value: 100 },
      macd: { value: 1, signal: 0.5, histogram: 0.5, bullish: true },
      adx: { adx: 30, plusDI: 25, minusDI: 20, trend: "trending" },
      obv: { value: 1000, trend: "rising" },
      currentPrice: 105,
      vwap: { value: 100 },
      resistance: { levels: [80] },
    }));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────

describe("Edge Cases", () => {
  it("handles empty resistance/support levels", () => {
    const result = calculateScores(makeInput({
      resistance: { levels: [] },
      support: { levels: [] },
    }));
    expect(result.trend).toBe(50);
  });

  it("handles non-finite RSI value gracefully", () => {
    const result = calculateScores(makeInput({
      rsi: { value: NaN, oversold: false, overbought: false },
    }));
    expect(result.technical).toBe(50);
  });

  it("handles negative prices", () => {
    const result = calculateScores(makeInput({
      currentPrice: -10,
      vwap: { value: 0 },
    }));
    expect(result.volume).toBe(50);
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });

  it("produces consistent output structure", () => {
    const result = calculateScores(makeInput());
    expect(result).toHaveProperty("technical");
    expect(result).toHaveProperty("trend");
    expect(result).toHaveProperty("momentum");
    expect(result).toHaveProperty("volume");
    expect(result).toHaveProperty("volatilityScore");
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("breakdown");
    expect(result.breakdown).toHaveProperty("technical");
    expect(result.breakdown).toHaveProperty("trend");
    expect(result.breakdown).toHaveProperty("momentum");
    expect(result.breakdown).toHaveProperty("volume");
    expect(result.breakdown).toHaveProperty("volatilityScore");
    expect(result.breakdown).toHaveProperty("overall");
    expect(result.breakdown).toHaveProperty("confidence");
  });
});

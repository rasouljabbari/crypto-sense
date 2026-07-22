import { describe, it, expect } from "vitest";
import { analyzeMarket } from "../market-analyzer/engine";
import type { OhlcvSample } from "../types";

function generateCandles(count: number, startPrice: number = 100): OhlcvSample[] {
  const candles: OhlcvSample[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    price *= (1 + (Math.random() - 0.5) * 0.02);
    candles.push({
      timestamp: 1000 + i * 3600,
      open: price * 0.999,
      high: price * 1.005,
      low: price * 0.995,
      close: price,
      volume: 1000 + Math.random() * 500,
    });
  }
  return candles;
}

function makeCandles(closes: number[]): OhlcvSample[] {
  const baseVol = 1000 + Math.random() * 500;
  return closes.map((c, i) => ({
    timestamp: i,
    open: closes[Math.max(0, i - 1)] * 0.999 || c,
    high: c * 1.015,
    low: c * 0.985,
    close: c,
    volume: baseVol + i * 10,
  }));
}

describe("Market Analyzer", () => {
  it("returns complete result with all sections", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.currentPrice).toBeGreaterThan(0);
    expect(r.candleCount).toBe(250);
    expect(r.indicators).toBeDefined();
    expect(r.scores).toBeDefined();
    expect(r.signal).toBeDefined();
    expect(r.risk).toBeDefined();
    expect(r.tradeSetup).toBeDefined();
  });

  it("computes all indicator values", () => {
    const candles = generateCandles(250, 45000);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.indicators.sma20.value).toBeGreaterThan(0);
    expect(r.indicators.ema20.value).toBeGreaterThan(0);
    expect(r.indicators.ema50.value).toBeGreaterThan(0);
    expect(r.indicators.ema200.value).toBeGreaterThan(0);
    expect(r.indicators.rsi.value).toBeGreaterThanOrEqual(0);
    expect(r.indicators.rsi.value).toBeLessThanOrEqual(100);
    expect(r.indicators.macd.bullish).toBeDefined();
    expect(r.indicators.bollingerBands.upper).toBeGreaterThan(0);
    expect(r.indicators.atr.value).toBeGreaterThan(0);
    expect(r.indicators.adx.adx).toBeGreaterThanOrEqual(0);
    expect(r.indicators.vwap.value).toBeGreaterThan(0);
    expect(r.indicators.volatility.value).toBeGreaterThanOrEqual(0);
  });

  it("computes valid score and signal", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.scores.overall).toBeGreaterThanOrEqual(0);
    expect(r.scores.overall).toBeLessThanOrEqual(100);
    expect(r.scores.technical).toBeGreaterThanOrEqual(0);
    expect(r.scores.momentum).toBeGreaterThanOrEqual(0);

    expect(r.signal.score).toBe(r.scores.overall);
    expect(["strong_buy", "buy", "neutral", "sell", "strong_sell"]).toContain(r.signal.action);
  });

  it("computes valid risk values", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(r.risk.riskScore).toBeLessThanOrEqual(100);
    expect(["very_low", "low", "medium", "high", "extreme"]).toContain(r.risk.riskLevel);
    expect(r.risk.suggestedStopLoss).toBeGreaterThan(0);
    expect(r.risk.riskPercentage).toBeGreaterThan(0);
  });

  it("computes valid trade setup", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    // Entry may be 0 when signal is neutral — verify structure is consistent
    if (r.tradeSetup.entry > 0) {
      expect(r.tradeSetup.stopLoss).toBeGreaterThan(0);
      expect(r.tradeSetup.stopLoss).toBeLessThan(r.tradeSetup.entry);
      expect(r.tradeSetup.risk).toBeGreaterThan(0);
      expect(r.tradeSetup.takeProfit.tp1).toBeGreaterThan(r.tradeSetup.entry);
      expect(r.tradeSetup.takeProfit.tp2).toBeGreaterThan(r.tradeSetup.takeProfit.tp1);
      expect(r.tradeSetup.takeProfit.tp3).toBeGreaterThan(r.tradeSetup.takeProfit.tp2);
      expect(r.tradeSetup.position.positionSize).toBeGreaterThan(0);
      expect(r.tradeSetup.validation.isValid).toBe(true);
    } else {
      // neutral signal → no trade
      expect(r.tradeSetup.entry).toBe(0);
      expect(r.tradeSetup.stopLoss).toBe(0);
      expect(r.tradeSetup.risk).toBe(0);
      expect(r.tradeSetup.position.positionSize).toBe(0);
      expect(r.tradeSetup.validation.isValid).toBe(false);
    }
    expect(r.tradeSetup.tradeQuality).toBeGreaterThanOrEqual(0);
    expect(r.tradeSetup.tradeQuality).toBeLessThanOrEqual(100);
  });

  it("uses provided currentPrice when given", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, currentPrice: 999, accountBalance: 10000 });
    expect(r.currentPrice).toBe(999);
  });

  it("handles uptrend data correctly producing long signal", () => {
    const closes: number[] = [];
    for (let i = 0; i < 250; i++) closes.push(100 + i * 0.5);
    const candles = makeCandles(closes);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.indicators.trendDirection.direction).toBe("bullish");
    expect(r.scores.overall).toBeGreaterThan(50);
  });

  it("handles downtrend data correctly producing bearish signals", () => {
    const closes: number[] = [];
    for (let i = 0; i < 250; i++) closes.push(200 - i * 0.5);
    const candles = makeCandles(closes);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.indicators.trendDirection.direction).toBe("bearish");
  });

  it("handles minimal candle count gracefully", () => {
    const candles = generateCandles(30, 100);
    const r = analyzeMarket({ candles, accountBalance: 10000 });

    expect(r.indicators.ema200.value).toBe(0); // not enough data
    expect(r.tradeSetup.validation.isValid).toBeDefined();
    expect(r.scores.overall).toBeGreaterThanOrEqual(0);
  });

  it("handles zero account balance gracefully", () => {
    const candles = generateCandles(250, 100);
    const r = analyzeMarket({ candles, accountBalance: 0 });

    expect(r.tradeSetup.position.accountBalance).toBe(0);
    expect(r.tradeSetup.position.riskAmount).toBe(0);
    expect(r.tradeSetup.position.positionSize).toBe(0);
  });

  it("accepts custom risk percent", () => {
    const closes = Array.from({ length: 250 }, (_, i) => 100 + i * 0.5);
    const candles = makeCandles(closes);
    const r = analyzeMarket({ candles, accountBalance: 10000, riskPercent: 2 });
    expect(r.tradeSetup.position.riskPercent).toBe(2);
  });
});

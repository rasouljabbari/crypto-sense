import { describe, it, expect } from "vitest";
import { resolveSymbol, parseMarketData } from "../complete-engine/api";
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

describe("Complete Engine - Symbol Resolution", () => {
  it("resolves BTC to BTCUSDT", () => {
    expect(resolveSymbol("BTC")).toBe("BTCUSDT");
  });

  it("resolves btc to BTCUSDT", () => {
    expect(resolveSymbol("btc")).toBe("BTCUSDT");
  });

  it("resolves BTCUSDT to BTCUSDT", () => {
    expect(resolveSymbol("BTCUSDT")).toBe("BTCUSDT");
  });

  it("resolves eth to ETHUSDT", () => {
    expect(resolveSymbol("eth")).toBe("ETHUSDT");
  });

  it("resolves SOL to SOLUSDT", () => {
    expect(resolveSymbol("SOL")).toBe("SOLUSDT");
  });

  it("resolves unknown symbol as {symbol}USDT", () => {
    expect(resolveSymbol("XYZ123")).toBe("XYZ123USDT");
  });

  it("resolves unknown symbol with USDT already appended", () => {
    expect(resolveSymbol("XYZ123USDT")).toBe("XYZ123USDT");
  });

  it("handles empty string gracefully", () => {
    expect(resolveSymbol("")).toBe("USDT");
  });
});

describe("Complete Engine - Market Data Parsing", () => {
  const mockTicker = {
    symbol: "BTCUSDT",
    lastPrice: "50000.00",
    priceChange: "1200.50",
    priceChangePercent: "2.45",
    highPrice: "51000.00",
    lowPrice: "49000.00",
    volume: "15000.123",
    quoteVolume: "750000000.00",
  };

  it("parses all market data fields correctly", () => {
    const md = parseMarketData(mockTicker);
    expect(md.currentPrice).toBe(50000);
    expect(md.priceChange24h).toBe(1200.5);
    expect(md.priceChangePercent24h).toBe(2.45);
    expect(md.volume24h).toBe(750000000);
    expect(md.high24h).toBe(51000);
    expect(md.low24h).toBe(49000);
  });

  it("sets marketCap to 0 (filled later by computeMarketCap)", () => {
    const md = parseMarketData(mockTicker);
    expect(md.marketCap).toBe(0);
  });

  it("handles zero values", () => {
    const zeroTicker = { ...mockTicker, lastPrice: "0", priceChange: "0", priceChangePercent: "0", quoteVolume: "0" };
    const md = parseMarketData(zeroTicker);
    expect(md.currentPrice).toBe(0);
    expect(md.priceChange24h).toBe(0);
    expect(md.priceChangePercent24h).toBe(0);
    expect(md.volume24h).toBe(0);
  });
});

describe("Complete Engine - Output Structure", () => {
  function generateTicker(lastPrice: number = 100, priceChange: number = 2, quoteVolume: number = 1000000) {
    return {
      symbol: "BTCUSDT",
      lastPrice: String(lastPrice),
      priceChange: String(priceChange),
      priceChangePercent: String((priceChange / lastPrice) * 100),
      highPrice: String(lastPrice * 1.02),
      lowPrice: String(lastPrice * 0.98),
      volume: "15000",
      quoteVolume: String(quoteVolume),
    };
  }

  it("produces all required indicator fields in output", () => {
    const candles = generateCandles(250, 45000);
    const lastClose = candles[candles.length - 1].close;

    const result = analyzeMarket({ candles, currentPrice: lastClose, accountBalance: 10000 });

    expect(result.indicators.rsi).toBeDefined();
    expect(result.indicators.rsi.value).toBeGreaterThanOrEqual(0);
    expect(result.indicators.rsi.value).toBeLessThanOrEqual(100);
    expect(typeof result.indicators.rsi.oversold).toBe("boolean");
    expect(typeof result.indicators.rsi.overbought).toBe("boolean");

    expect(result.indicators.macd).toBeDefined();
    expect(typeof result.indicators.macd.value).toBe("number");
    expect(typeof result.indicators.macd.signal).toBe("number");
    expect(typeof result.indicators.macd.histogram).toBe("number");
    expect(typeof result.indicators.macd.bullish).toBe("boolean");

    expect(result.indicators.ema20).toBeDefined();
    expect(result.indicators.ema20.value).toBeGreaterThan(0);
    expect(result.indicators.ema20.period).toBe(20);

    expect(result.indicators.ema50).toBeDefined();
    expect(result.indicators.ema50.period).toBe(50);

    expect(result.indicators.ema200).toBeDefined();
    expect(result.indicators.ema200.period).toBe(200);

    expect(result.indicators.bollingerBands).toBeDefined();
    expect(result.indicators.bollingerBands.upper).toBeGreaterThan(0);
    expect(result.indicators.bollingerBands.lower).toBeGreaterThan(0);
    expect(["above", "below", "inside"]).toContain(result.indicators.bollingerBands.pricePosition);

    expect(result.indicators.atr).toBeDefined();
    expect(result.indicators.atr.value).toBeGreaterThanOrEqual(0);

    expect(result.indicators.adx).toBeDefined();
    expect(result.indicators.adx.adx).toBeGreaterThanOrEqual(0);
    expect(["strong", "trending", "ranging"]).toContain(result.indicators.adx.trend);
    expect(result.indicators.adx.plusDI).toBeGreaterThanOrEqual(0);
    expect(result.indicators.adx.minusDI).toBeGreaterThanOrEqual(0);

    expect(result.indicators.obv).toBeDefined();
    expect(["rising", "falling", "flat"]).toContain(result.indicators.obv.trend);

    expect(result.indicators.vwap).toBeDefined();
    expect(result.indicators.vwap.value).toBeGreaterThan(0);
  });

  it("produces all required detection fields in output", () => {
    const candles = generateCandles(250, 100);
    const lastClose = candles[candles.length - 1].close;

    const result = analyzeMarket({ candles, currentPrice: lastClose, accountBalance: 10000 });

    expect(result.indicators.trendDirection).toBeDefined();
    expect(["bullish", "bearish", "neutral"]).toContain(result.indicators.trendDirection.direction);

    expect(result.indicators.trendStrength).toBeDefined();
    expect(["strong", "moderate", "weak"]).toContain(result.indicators.trendStrength.label);

    expect(result.indicators.support).toBeDefined();
    expect(Array.isArray(result.indicators.support.levels)).toBe(true);
    if (result.indicators.support.levels.length > 0) {
      for (const level of result.indicators.support.levels) {
        expect(level).toBeLessThan(result.currentPrice);
      }
    }

    expect(result.indicators.resistance).toBeDefined();
    expect(Array.isArray(result.indicators.resistance.levels)).toBe(true);
    if (result.indicators.resistance.levels.length > 0) {
      for (const level of result.indicators.resistance.levels) {
        expect(level).toBeGreaterThan(result.currentPrice);
      }
    }

    expect(result.indicators.volatility).toBeDefined();
    expect(result.indicators.volatility.value).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high", "extreme"]).toContain(result.indicators.volatility.label);
    expect(result.indicators.volatility.annualized).toBeGreaterThanOrEqual(0);
  });

  it("structure matches the CompleteMarketAnalysisResult contract", () => {
    const candles = generateCandles(250, 100);
    const ticker = generateTicker(100, 2, 1000000);
    const marketData = parseMarketData(ticker);

    const r = analyzeMarket({ candles, currentPrice: marketData.currentPrice, accountBalance: 10000 });

    const snapshot = {
      symbol: "BTCUSDT",
      coinId: "btc",
      timestamp: Date.now(),
      candleCount: candles.length,
      candles,
      marketData,
      indicators: {
        rsi: r.indicators.rsi,
        macd: r.indicators.macd,
        ema20: r.indicators.ema20,
        ema50: r.indicators.ema50,
        ema200: r.indicators.ema200,
        bollingerBands: r.indicators.bollingerBands,
        atr: r.indicators.atr,
        adx: r.indicators.adx,
        obv: r.indicators.obv,
        vwap: r.indicators.vwap,
      },
      detection: {
        trend: r.indicators.trendDirection,
        trendStrength: r.indicators.trendStrength,
        support: r.indicators.support,
        resistance: r.indicators.resistance,
        volatility: r.indicators.volatility,
      },
    };

    expect(typeof snapshot.symbol).toBe("string");
    expect(typeof snapshot.coinId).toBe("string");
    expect(typeof snapshot.timestamp).toBe("number");
    expect(snapshot.candleCount).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.candles)).toBe(true);

    expect(snapshot.marketData.currentPrice).toBe(100);
    expect(snapshot.marketData.priceChange24h).toBe(2);
    expect(snapshot.marketData.priceChangePercent24h).toBe(2);
    expect(snapshot.marketData.volume24h).toBe(1000000);

    expect(Object.keys(snapshot.indicators)).toEqual([
      "rsi", "macd", "ema20", "ema50", "ema200",
      "bollingerBands", "atr", "adx", "obv", "vwap",
    ]);

    expect(Object.keys(snapshot.detection)).toEqual([
      "trend", "trendStrength", "support", "resistance", "volatility",
    ]);
  });
});

describe("Complete Engine - Edge Cases", () => {
  it("handles minimal candle count gracefully", () => {
    const candles = generateCandles(30, 100);
    const lastClose = candles[candles.length - 1].close;
    const result = analyzeMarket({ candles, currentPrice: lastClose, accountBalance: 10000 });

    expect(result.indicators.ema200.value).toBe(0);
    expect(result.indicators.rsi.value).toBeGreaterThanOrEqual(0);
  });

  it("handles very volatile data without crashing", () => {
    const candles: OhlcvSample[] = [];
    let price = 100;
    for (let i = 0; i < 250; i++) {
      price *= (1 + (Math.random() - 0.5) * 0.1);
      candles.push({
        timestamp: i,
        open: price * 0.99,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: Math.random() * 10000,
      });
    }
    const result = analyzeMarket({ candles, currentPrice: 100, accountBalance: 10000 });

    expect(result.indicators.volatility.label).toBeDefined();
    expect(result.indicators.atr.value).toBeGreaterThanOrEqual(0);
  });

  it("handles uptrend data correctly", () => {
    const closes: number[] = [];
    for (let i = 0; i < 250; i++) closes.push(100 + i * 0.5);
    const candles = closes.map((c, i) => ({
      timestamp: i,
      open: closes[Math.max(0, i - 1)] * 0.999 || c,
      high: c * 1.015,
      low: c * 0.985,
      close: c,
      volume: 1000 + i * 10,
    }));
    const result = analyzeMarket({ candles, currentPrice: closes[closes.length - 1], accountBalance: 10000 });

    expect(result.indicators.trendDirection.direction).toBe("bullish");
  });

  it("handles downtrend data correctly", () => {
    const closes: number[] = [];
    for (let i = 0; i < 250; i++) closes.push(200 - i * 0.5);
    const candles = closes.map((c, i) => ({
      timestamp: i,
      open: closes[Math.max(0, i - 1)] * 0.999 || c,
      high: c * 1.015,
      low: c * 0.985,
      close: c,
      volume: 1000 + i * 10,
    }));
    const result = analyzeMarket({ candles, currentPrice: closes[closes.length - 1], accountBalance: 10000 });

    expect(result.indicators.trendDirection.direction).toBe("bearish");
  });
});

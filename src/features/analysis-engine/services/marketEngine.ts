// ---------------------------------------------------------------------------
// Market Engine
// Input:  coin symbol (coinId or Binance symbol)
// Output: MarketSnapshot — normalized price + candles (1H primary)
// ---------------------------------------------------------------------------

import { MarketRepository } from "../api/repositories/MarketRepository";
import type {
  MarketData,
  MarketSnapshot,
  OHLCV,
  PriceData,
  CandleCollection,
} from "../types";

// ─── Normalization Helpers ────────────────────────────────────────────────

function normalizePrice(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  // Round to max 8 decimals (Binance precision)
  return Math.round(value * 1e8) / 1e8;
}

function normalizeVolume(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  // 2 decimal precision for USD values
  return Math.round(value * 100) / 100;
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  // 4 decimal precision for percentage
  return Math.round(value * 1e4) / 1e4;
}

function normalizeCandle(c: OHLCV): OHLCV {
  return {
    timestamp: c.timestamp,
    open: normalizePrice(c.open),
    high: normalizePrice(c.high),
    low: normalizePrice(c.low),
    close: normalizePrice(c.close),
    volume: normalizeVolume(c.volume),
  };
}

// ─── Symbol Resolver ──────────────────────────────────────────────────────

const BASE_ASSET_PATTERN = /^[A-Z]{2,10}$/;
const BINANCE_SYMBOL_PATTERN = /^[A-Z]{2,10}USDT$/;
const COIN_ID_PATTERN = /^[a-z][a-z0-9-]+$/;

// ─── Engine ───────────────────────────────────────────────────────────────

export interface MarketEngineOptions {
  readonly signal?: AbortSignal;
}

export class MarketEngine {
  private readonly marketRepo: MarketRepository;

  constructor(marketRepo?: MarketRepository) {
    this.marketRepo = marketRepo ?? new MarketRepository();
  }

  async getSnapshot(
    symbol: string,
    options?: MarketEngineOptions,
  ): Promise<MarketSnapshot> {
    const binanceSymbol = this.resolveSymbol(symbol);
    if (binanceSymbol === undefined) {
      throw new Error(
        `Cannot resolve symbol: "${symbol}". Use a Binance symbol (e.g. BTCUSDT), ` +
        `coin ID (e.g. bitcoin), or base asset (e.g. BTC).`,
      );
    }

    const signal = options?.signal;

    // Fetch ticker + all candle intervals in parallel
    const [tickerResult, candles1h, candles4h, candles1d] = await Promise.all([
      this.marketRepo.getTicker(binanceSymbol, signal),
      this.marketRepo.getKlines(binanceSymbol, "1h", 200, signal),
      this.marketRepo.getKlines(binanceSymbol, "4h", 42, signal),
      this.marketRepo.getKlines(binanceSymbol, "1d", 30, signal),
    ]);

    if (tickerResult === null) {
      throw new Error(
        `No ticker data returned for symbol: ${binanceSymbol}`,
      );
    }

    return this.buildSnapshot(binanceSymbol, tickerResult, {
      "1h": candles1h,
      "4h": candles4h,
      "1d": candles1d,
    });
  }

  // ─── Snapshot Builder ──────────────────────────────────────────────

  private buildSnapshot(
    binanceSymbol: string,
    ticker: MarketData,
    rawCandles: Record<"1h" | "4h" | "1d", readonly OHLCV[]>,
  ): MarketSnapshot {
    const price: PriceData = {
      current: normalizePrice(ticker.currentPrice),
      high24h: normalizePrice(ticker.high24h),
      low24h: normalizePrice(ticker.low24h),
      volume24h: normalizeVolume(ticker.volume24h),
      change24h: normalizePrice(ticker.priceChange24h),
      changePercent24h: normalizePercent(ticker.priceChangePercent24h),
    };

    const candles: CandleCollection = {
      "1h": rawCandles["1h"].map(normalizeCandle),
      "4h": rawCandles["4h"].map(normalizeCandle),
      "1d": rawCandles["1d"].map(normalizeCandle),
    };

    return {
      symbol: binanceSymbol,
      coinId: ticker.coinId,
      price,
      candles,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ─── Symbol Resolution ─────────────────────────────────────────────

  private resolveSymbol(input: string): string | undefined {
    const trimmed = input.trim().toUpperCase();

    // Already a Binance symbol
    if (BINANCE_SYMBOL_PATTERN.test(trimmed)) {
      if (this.marketRepo.resolveCoinId(trimmed) !== undefined) {
        return trimmed;
      }
    }

    // Try as coin ID (e.g. "bitcoin")
    const lower = input.trim().toLowerCase();
    if (COIN_ID_PATTERN.test(lower)) {
      const sym = this.marketRepo.resolveBinanceSymbol(lower);
      if (sym !== undefined) return sym;
    }

    // Try as base asset (e.g. "BTC" → "BTCUSDT")
    if (BASE_ASSET_PATTERN.test(trimmed)) {
      const candidate = `${trimmed}USDT`;
      if (this.marketRepo.resolveCoinId(candidate) !== undefined) {
        return candidate;
      }
    }

    return undefined;
  }
}

import type { OhlcvSample } from "../types";
import { analyzeMarket } from "../market-analyzer";
import type { MarketAnalysisResult } from "../market-analyzer";
import {
  resolveSymbol,
  fetchKlines,
  fetch24hrTicker,
  parseMarketData,
} from "./api";
import type {
  CompleteMarketData,
  CompleteIndicatorSnapshot,
  CompleteDetectionSnapshot,
  CompleteMarketAnalysisResult,
  AnalyzeSymbolInput,
} from "./types";

const AVERAGE_CIRCULATING_SUPPLY: Record<string, number> = {
  BTC: 19700000,
  ETH: 120200000,
  BNB: 145887575,
  SOL: 463800000,
  XRP: 55200000000,
  DOGE: 144700000000,
  ADA: 35400000000,
  TRX: 88000000000,
  LINK: 587000000,
  AVAX: 394000000,
  DOT: 1428000000,
  LTC: 75000000,
  BCH: 19700000,
  ATOM: 390000000,
  ETC: 150000000,
  XLM: 28700000000,
  FIL: 500000000,
  ICP: 460000000,
  APT: 452000000,
  NEAR: 1090000000,
  ARB: 2650000000,
  OP: 900000000,
  INJ: 90000000,
  TIA: 200000000,
  SEI: 2500000000,
  SUI: 1200000000,
  WLD: 700000000,
  TON: 5100000000,
  AAVE: 16000000,
  UNI: 750000000,
  MKR: 970000,
  HBAR: 35000000000,
  VET: 72000000000,
  ALGO: 8000000000,
  EOS: 1100000000,
  NEO: 100000000,
  SHIB: 589000000000000,
  FLOKI: 9600000000000,
  BONK: 93000000000000,
  SAND: 1500000000,
  MANA: 1900000000,
  AXS: 140000000,
  CHZ: 9000000000,
  THETA: 1000000000,
  CAKE: 350000000,
  STX: 1500000000,
};

function extractBaseSymbol(binanceSymbol: string): string {
  return binanceSymbol.replace("USDT", "");
}

function computeMarketCap(
  ticker: ReturnType<typeof parseMarketData>,
  binanceSymbol: string,
): number {
  const base = extractBaseSymbol(binanceSymbol);
  const supply = AVERAGE_CIRCULATING_SUPPLY[base];
  if (supply && supply > 0) {
    return Math.round(ticker.currentPrice * supply);
  }
  return 0;
}

function extractIndicatorSnapshot(
  full: MarketAnalysisResult,
): CompleteIndicatorSnapshot {
  return {
    rsi: full.indicators.rsi,
    macd: full.indicators.macd,
    ema20: full.indicators.ema20,
    ema50: full.indicators.ema50,
    ema200: full.indicators.ema200,
    bollingerBands: full.indicators.bollingerBands,
    atr: full.indicators.atr,
    adx: full.indicators.adx,
    obv: full.indicators.obv,
    vwap: full.indicators.vwap,
  };
}

function extractDetectionSnapshot(
  full: MarketAnalysisResult,
): CompleteDetectionSnapshot {
  return {
    trend: full.indicators.trendDirection,
    trendStrength: full.indicators.trendStrength,
    support: full.indicators.support,
    resistance: full.indicators.resistance,
    volatility: full.indicators.volatility,
  };
}

export async function analyzeSymbol(
  input: AnalyzeSymbolInput,
): Promise<CompleteMarketAnalysisResult> {
  const { symbol, interval = "1h", limit = 250 } = input;

  const binanceSymbol = resolveSymbol(symbol);

  const [candles, ticker] = await Promise.all([
    fetchKlines(binanceSymbol, interval, limit),
    fetch24hrTicker(binanceSymbol),
  ]);

  const marketData = parseMarketData(ticker);
  const marketCap = computeMarketCap(marketData, binanceSymbol);
  const completeMarketData: CompleteMarketData = { ...marketData, marketCap };

  const full = analyzeMarket({
    candles,
    currentPrice: completeMarketData.currentPrice,
    accountBalance: 0,
  });

  return {
    symbol: binanceSymbol,
    coinId: extractBaseSymbol(binanceSymbol).toLowerCase(),
    timestamp: Date.now(),
    candleCount: candles.length,
    candles,
    marketData: completeMarketData,
    indicators: extractIndicatorSnapshot(full),
    detection: extractDetectionSnapshot(full),
  };
}

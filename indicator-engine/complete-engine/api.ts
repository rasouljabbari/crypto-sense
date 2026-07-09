import type { OhlcvSample } from "../types";
import type { CompleteMarketData } from "./types";

const BINANCE_REST = "https://api.binance.com/api/v3";

const FUTURES_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT",
  "TRXUSDT", "LINKUSDT", "AVAXUSDT", "DOTUSDT", "LTCUSDT", "BCHUSDT", "ATOMUSDT",
  "ETCUSDT", "XLMUSDT", "FILUSDT", "ICPUSDT", "APTUSDT", "NEARUSDT", "ARBUSDT",
  "OPUSDT", "INJUSDT", "TIAUSDT", "SEIUSDT", "SUIUSDT", "WLDUSDT", "TAOUSDT",
  "AAVEUSDT", "UNIUSDT", "MKRUSDT", "RENDERUSDT", "FETUSDT", "ENAUSDT", "ONDOUSDT",
  "JUPUSDT", "PYTHUSDT", "BONKUSDT", "FLOKIUSDT", "SHIBUSDT", "THETAUSDT", "GRTUSDT",
  "SANDUSDT", "MANAUSDT", "AXSUSDT", "CHZUSDT", "FLOWUSDT", "EGLDUSDT", "ALGOUSDT",
  "VETUSDT", "HBARUSDT", "TONUSDT", "QNTUSDT", "XTZUSDT", "EOSUSDT", "NEOUSDT",
  "KAVAUSDT", "ZECUSDT", "IOTAUSDT", "COMPUSDT", "SNXUSDT", "1INCHUSDT", "DYDXUSDT",
  "LDOUSDT", "STRKUSDT", "CFXUSDT", "ROSEUSDT", "MEMEUSDT", "WIFUSDT", "JASMYUSDT",
  "RAYUSDT", "CAKEUSDT", "GALAUSDT", "BEAMUSDT", "ORDIUSDT", "ETHFIUSDT", "PENDLEUSDT",
  "NOTUSDT", "ZKUSDT", "SUPERUSDT", "TWTUSDT", "HOTUSDT", "ANKRUSDT", "WOOUSDT",
  "RVNUSDT", "LRCUSDT", "BANDUSDT", "SFPUSDT", "SKLUSDT", "OCEANUSDT", "CELOUSDT",
  "ICXUSDT", "ZENUSDT", "STXUSDT", "ARKMUSDT", "BLURUSDT", "GMXUSDT", "ZRXUSDT",
];

const SYMBOL_MAP: Record<string, string> = {};
for (const sym of FUTURES_SYMBOLS) {
  const base = sym.replace("USDT", "").toLowerCase();
  SYMBOL_MAP[base] = sym;
  SYMBOL_MAP[sym] = sym;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
}

function parseKline(raw: string[]): BinanceKline {
  return {
    openTime: Number(raw[0]),
    open: raw[1],
    high: raw[2],
    low: raw[3],
    close: raw[4],
    volume: raw[5],
    closeTime: Number(raw[6]),
    quoteVolume: raw[7],
    trades: Number(raw[8]),
  };
}

function toOhlcvSample(k: BinanceKline): OhlcvSample {
  return {
    timestamp: k.openTime,
    open: parseFloat(k.open),
    high: parseFloat(k.high),
    low: parseFloat(k.low),
    close: parseFloat(k.close),
    volume: parseFloat(k.volume),
  };
}

export function resolveSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (SYMBOL_MAP[normalized]) return SYMBOL_MAP[normalized];
  if (SYMBOL_MAP[normalized.toLowerCase()]) return SYMBOL_MAP[normalized.toLowerCase()];
  if (normalized.endsWith("USDT")) return normalized;
  return `${normalized}USDT`;
}

interface Ticker24hrData {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export async function fetchKlines(
  binanceSymbol: string,
  interval: string = "1h",
  limit: number = 250,
): Promise<OhlcvSample[]> {
  const params = new URLSearchParams({
    symbol: binanceSymbol,
    interval,
    limit: String(Math.min(limit, 1000)),
  });

  const res = await fetch(`${BINANCE_REST}/klines?${params}`);
  if (!res.ok) {
    throw new Error(`Binance klines API error: ${res.status} ${res.statusText}`);
  }

  const raw: string[][] = await res.json();
  return raw.map((k) => toOhlcvSample(parseKline(k)));
}

export async function fetch24hrTicker(
  binanceSymbol: string,
): Promise<Ticker24hrData> {
  const params = new URLSearchParams({ symbol: binanceSymbol });
  const res = await fetch(`${BINANCE_REST}/ticker/24hr?${params}`);
  if (!res.ok) {
    throw new Error(`Binance 24hr ticker API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Ticker24hrData>;
}

export function parseMarketData(ticker: Ticker24hrData): CompleteMarketData {
  const currentPrice = parseFloat(ticker.lastPrice);
  const priceChange24h = parseFloat(ticker.priceChange);
  const priceChangePercent24h = parseFloat(ticker.priceChangePercent);
  const volume24h = parseFloat(ticker.quoteVolume);
  const high24h = parseFloat(ticker.highPrice);
  const low24h = parseFloat(ticker.lowPrice);

  return {
    currentPrice,
    priceChange24h,
    priceChangePercent24h,
    volume24h,
    marketCap: 0,
    high24h,
    low24h,
  };
}

import { NextResponse } from "next/server";
import { ALL_BINANCE_SYMBOLS } from "@/api/binance";

const BINANCE_REST = "https://api.binance.com/api/v3";

const API_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; CryptoSense/1.0)",
  "Accept": "application/json",
};

interface ExchangePair {
  symbol: string;
  baseAsset: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  binanceSymbol: string;
  price: string;
  changePercent: string;
  volume: string;
}

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

let exchangeInfoCache: ExchangePair[] | null = null;
let lastFetch = 0;
let fetchPromise: Promise<ExchangePair[]> | null = null;

const FALLBACK_PAIRS: ExchangePair[] = ALL_BINANCE_SYMBOLS.map((sym) => ({
  symbol: sym,
  baseAsset: sym.replace("USDT", ""),
}));

async function getExchangeInfo(): Promise<ExchangePair[]> {
  const now = Date.now();
  if (exchangeInfoCache && now - lastFetch < 86400000) return exchangeInfoCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const res = await fetch(`${BINANCE_REST}/exchangeInfo`, { headers: API_HEADERS });
    if (!res.ok) {
      if (res.status === 451) return [];
      throw new Error(`exchangeInfo error: ${res.status}`);
    }
    const json: { symbols: any[] } = await res.json();
    const pairs: ExchangePair[] = json.symbols
      .filter((s: any) => s.status === "TRADING" && s.quoteAsset === "USDT")
      .map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset }));
    exchangeInfoCache = pairs;
    lastFetch = Date.now();
    return pairs;
  })();

  try {
    return await fetchPromise;
  } finally {
    fetchPromise = null;
  }
}

// Pre-fetch exchangeInfo on first import (cold start)
getExchangeInfo().catch(() => {});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toUpperCase().trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    let pairs: ExchangePair[];
    try {
      pairs = await getExchangeInfo();
    } catch {
      pairs = FALLBACK_PAIRS;
    }
    if (pairs.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const quoteAssets = ["USDT", "USDC", "BUSD", "FDUSD", "BNB", "BTC", "ETH", "TRY", "DAI"];
    let baseQ = q;
    for (const qa of quoteAssets) {
      if (baseQ.endsWith(qa) && baseQ.length > qa.length) {
        baseQ = baseQ.slice(0, -qa.length);
        break;
      }
    }

    const matched = pairs.filter(
      (p) =>
        (p.baseAsset && p.baseAsset.includes(baseQ)) ||
        (p.baseAsset && p.baseAsset.includes(q)) ||
        (p.symbol && p.symbol.includes(q))
    ).slice(0, 10);

    if (matched.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const symbols = matched.map((p) => p.symbol);
    const params = new URLSearchParams();
    params.set("symbols", JSON.stringify(symbols));
    const tickerRes = await fetch(
      `${BINANCE_REST}/ticker/24hr?${params}`,
      { headers: API_HEADERS }
    );
    if (!tickerRes.ok) {
      return NextResponse.json({ error: "ticker error" }, { status: 502 });
    }
    const tickers: BinanceTicker[] = await tickerRes.json();

    const results: SearchResult[] = (Array.isArray(tickers) ? tickers : []).map((t) => {
      if (!t || !t.symbol) return null;
      const pair = matched.find((p) => p.symbol === t.symbol);
      const baseAsset =
        pair?.baseAsset ?? (t.symbol ? t.symbol.replace(/USDT|USDC|BUSD|FDUSD|BNB|BTC|ETH|TRY|DAI$/, "") : "?");
      return {
        symbol: baseAsset,
        name: baseAsset,
        binanceSymbol: t.symbol,
        price: t.lastPrice ?? "0",
        changePercent: t.priceChangePercent ?? "0",
        volume: t.quoteVolume ?? "0",
      };
    }).filter((r): r is SearchResult => r !== null);

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

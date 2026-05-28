import { NextResponse } from "next/server";

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
  rsi: number;
}

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

let exchangeInfoCache: ExchangePair[] | null = null;
let lastFetch = 0;

async function getExchangeInfo(): Promise<ExchangePair[]> {
  const now = Date.now();
  if (exchangeInfoCache && now - lastFetch < 3600000) return exchangeInfoCache;
  const res = await fetch(`${BINANCE_REST}/exchangeInfo`, { headers: API_HEADERS });
  if (!res.ok) {
    if (res.status === 451) {
      // Binance blocked from this region — return nothing
      return [];
    }
    throw new Error(`exchangeInfo error: ${res.status}`);
  }
  const json: { symbols: any[] } = await res.json();
  const pairs: ExchangePair[] = json.symbols
    .filter((s: any) => s.status === "TRADING" && s.quoteAsset === "USDT")
    .map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset }));
  exchangeInfoCache = pairs;
  lastFetch = now;
  return pairs;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  let avgGain = 0;
  let avgLoss = 0;
  for (const c of recent) {
    if (c > 0) avgGain += c;
    else avgLoss -= c;
  }
  avgGain /= period;
  avgLoss /= period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toUpperCase().trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const pairs = await getExchangeInfo();
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
      (p) => p.baseAsset.includes(baseQ) || p.baseAsset.includes(q) || p.symbol.includes(q)
    ).slice(0, 10);

    if (matched.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const symbols = matched.map((p) => p.symbol);
    const tickerRes = await fetch(
      `${BINANCE_REST}/ticker/24hr?symbols=${JSON.stringify(symbols)}`,
      { headers: API_HEADERS }
    );
    if (!tickerRes.ok) {
      return NextResponse.json({ error: "ticker error" }, { status: 502 });
    }
    const tickers: BinanceTicker[] = await tickerRes.json();

    const klinesPromises = tickers.slice(0, 5).map(async (t) => {
      try {
        const res = await fetch(`${BINANCE_REST}/klines?symbol=${t.symbol}&interval=1h&limit=15`, { headers: API_HEADERS });
        if (!res.ok) return { symbol: t.symbol, rsi: 50 };
        const data: string[][] = await res.json();
        return { symbol: t.symbol, rsi: calcRSI(data.map((k) => parseFloat(k[4]))) };
      } catch {
        return { symbol: t.symbol, rsi: 50 };
      }
    });
    const klinesResults = await Promise.all(klinesPromises);
    const rsiMap = new Map(klinesResults.map((k) => [k.symbol, k.rsi]));

    const results: SearchResult[] = tickers.map((t) => {
      const pair = matched.find((p) => p.symbol === t.symbol);
      const baseAsset = pair?.baseAsset ?? t.symbol.replace(/USDT|USDC|BUSD|FDUSD|BNB|BTC|ETH|TRY|DAI$/, "");
      return {
        symbol: baseAsset,
        name: baseAsset,
        binanceSymbol: t.symbol,
        price: t.lastPrice,
        changePercent: t.priceChangePercent,
        volume: t.quoteVolume,
        rsi: rsiMap.get(t.symbol) ?? 50,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

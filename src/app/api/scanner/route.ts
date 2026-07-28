import { NextResponse } from "next/server";
import { fetchAllTickers } from "@/api/binance";

interface ScanResult {
  id: number;
  coin: string;
  price: string;
  signal: "LONG" | "SHORT" | "NEUTRAL";
  score: number;
  vol: string;
  dir: "up" | "down";
}

function formatPrice(p: number): string {
  if (p >= 1) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function determineSignal(changePercent: number): { signal: "LONG" | "SHORT" | "NEUTRAL"; dir: "up" | "down" } {
  if (changePercent > 1.5) return { signal: "LONG", dir: "up" };
  if (changePercent < -1.5) return { signal: "SHORT", dir: "down" };
  return { signal: "NEUTRAL", dir: changePercent >= 0 ? "up" : "down" };
}

function calculateScore(changePercent: number, volume: number): number {
  const changeScore = Math.min(Math.abs(changePercent) * 15, 50);
  const volScore = Math.min(Math.log10(volume) * 5, 40);
  return Math.min(Math.round(changeScore + volScore), 99);
}

const TARGET_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "AVAXUSDT"];

export async function GET() {
  try {
    const tickers = await fetchAllTickers();
    const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

    const results: ScanResult[] = [];
    for (const sym of TARGET_SYMBOLS) {
      const t = tickerMap.get(sym);
      if (!t) continue;
      const base = sym.replace("USDT", "");
      const price = parseFloat(t.lastPrice);
      const vol = parseFloat(t.quoteVolume);
      const changePercent = parseFloat(t.priceChangePercent);
      if (isNaN(price) || isNaN(vol) || price <= 0) continue;
      const { signal, dir } = determineSignal(changePercent);
      const score = calculateScore(changePercent, vol);
      results.push({
        id: results.length + 1,
        coin: `${base}/USDT`,
        price: formatPrice(price),
        signal,
        score,
        vol: formatVolume(vol),
        dir,
      });
    }

    return NextResponse.json({ results, scanned: results.length, updatedAt: Date.now() });
  } catch (e) {
    console.error("/api/scanner error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ results: [], scanned: 0, updatedAt: Date.now() });
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
    const json = await res.json();
    const d = json.data;

    const mcp = d.market_cap_percentage as Record<string, number>;
    const top10 = Object.entries(mcp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const top10Sum = top10.reduce((s, [, v]) => s + v, 0);

    return NextResponse.json({
      totalMarketCap: d.total_market_cap?.usd ?? 0,
      totalVolume24h: d.total_volume?.usd ?? 0,
      btcDominance: mcp?.btc ?? 0,
      ethDominance: mcp?.eth ?? 0,
      usdtDominance: mcp?.usdt ?? 0,
      bnbDominance: mcp?.bnb ?? 0,
      top10DominanceSum: top10Sum,
      updatedAt: d.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch global data" }, { status: 502 });
  }
}

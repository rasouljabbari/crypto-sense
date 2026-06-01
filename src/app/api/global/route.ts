import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_MCAP = 1.5e9;

export const revalidate = 60;

export async function GET() {
  try {
    const [globalRes, coinsRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/global", {
        next: { revalidate: 60 },
        headers: { "Accept": "application/json", "User-Agent": "CryptoSense/1.0" },
      }),
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&sparkline=false", {
        next: { revalidate: 60 },
        headers: { "Accept": "application/json", "User-Agent": "CryptoSense/1.0" },
      }),
    ]);

    if (!globalRes.ok) throw new Error(`CoinGecko global error: ${globalRes.status}`);
    if (!coinsRes.ok) throw new Error(`CoinGecko coins error: ${coinsRes.status}`);

    const globalJson = await globalRes.json();
    const coins = await coinsRes.json();

    const d = globalJson.data;
    const btc = coins.find((c: any) => c.id === "bitcoin");
    const eth = coins.find((c: any) => c.id === "ethereum");
    const usdt = coins.find((c: any) => c.id === "tether");
    const bnb = coins.find((c: any) => c.id === "binancecoin");

    const btcCap = btc?.market_cap ?? 0;
    const ethCap = eth?.market_cap ?? 0;

    const significant = coins.filter((c: any) => (c.market_cap ?? 0) >= MIN_MCAP);
    const totalMarketCap = significant.reduce((s: number, c: any) => s + (c.market_cap ?? 0), 0);

    const totalExBtc = totalMarketCap - btcCap;
    const totalExTop10 = totalMarketCap - btcCap - ethCap;
    const btcDominance = totalMarketCap > 0 ? (btcCap / totalMarketCap) * 100 : 55;
    const ethDominance = totalMarketCap > 0 ? (ethCap / totalMarketCap) * 100 : 10;

    const totalVolume24h = d.total_volume?.usd ?? 0;
    const usdtCap = usdt?.market_cap ?? 0;
    const bnbCap = bnb?.market_cap ?? 0;
    const usdtDominance = totalMarketCap > 0 ? (usdtCap / totalMarketCap) * 100 : 0;
    const bnbDominance = totalMarketCap > 0 ? (bnbCap / totalMarketCap) * 100 : 0;

    const top10 = significant.slice(0, 10);
    const top10Sum = top10.reduce((s: number, c: any) => s + (c.market_cap ?? 0), 0);
    const top10DominanceSum = totalMarketCap > 0 ? (top10Sum / totalMarketCap) * 100 : 0;
    const othersDominance = Math.max(0, 100 - top10DominanceSum);

    let snapData: any = null;
    try {
      const snapId = () => {
        const d = new Date();
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      };
      const today = snapId();
      const existing = await prisma.marketSnapshot.findUnique({ where: { id: today } }).catch(() => null);
      if (!existing) {
        await prisma.marketSnapshot.create({
          data: {
            id: today,
            totalMarketCap,
            totalVolume24h,
            btcDominance,
            ethDominance,
            usdtDominance,
            bnbDominance,
            othersDominance,
            totalExBtc,
            totalExTop10,
          },
        }).catch(() => {});
      }

      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayId = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`;
      const prev = await prisma.marketSnapshot.findUnique({ where: { id: yesterdayId } }).catch(() => null);

      if (prev) {
        const pct = (cur: number, prevVal: number) => prevVal > 0 ? ((cur - prevVal) / prevVal) * 100 : 0;
        snapData = {
          totalMarketCap: pct(totalMarketCap, prev.totalMarketCap),
          totalExBtc: pct(totalExBtc, prev.totalExBtc),
          totalExTop10: pct(totalExTop10, prev.totalExTop10),
          btcDominance: pct(btcDominance, prev.btcDominance),
          ethDominance: pct(ethDominance, prev.ethDominance),
          usdtDominance: pct(usdtDominance, prev.usdtDominance),
          othersDominance: pct(othersDominance, prev.othersDominance),
        };
      }
    } catch { /* db unavailable, skip snapshots */ }

    return NextResponse.json({
      totalMarketCap,
      totalVolume24h,
      btcDominance,
      ethDominance,
      usdtDominance,
      bnbDominance,
      othersDominance,
      totalExBtc,
      totalExTop10,
      change: snapData,
      updatedAt: d.updated_at,
    });
  } catch (e) {
    console.error("/api/global error:", e instanceof Error ? e.message : e);
    console.error("prisma keys:", Object.keys(prisma).filter(k => !k.startsWith('_')).join(","));
    return NextResponse.json({ error: "Failed to fetch global data" }, { status: 502 });
  }
}

"use client";

import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/Skeleton";
import { useI18n } from "@/i18n/context";
import { calcRSI, estimatePosition } from "@/lib/indicators";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface AugmentedCoin {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  rsi: number;
  position: "long" | "short" | "neutral";
  score: number;
}

const BINANCE_REST = "https://api.binance.com/api/v3";

async function fetchAugmentedBatch(items: { symbol: string; name: string }[]): Promise<Map<string, AugmentedCoin>> {
  try {
    const symbols = items.map((i) => i.symbol);
    const nameMap = new Map(items.map((i) => [i.symbol, i.name]));
    const binanceSymbols = symbols.map((s) => (s.endsWith("USDT") ? s : `${s}USDT`));
    const tickerRes = await fetch(`${BINANCE_REST}/ticker/24hr?symbols=${JSON.stringify(binanceSymbols)}`);
    if (!tickerRes.ok) return new Map();
    const tickers: any[] = await tickerRes.json();

    const klinesResults = await Promise.all(tickers.map(async (t: any) => {
      try {
        const res = await fetch(`${BINANCE_REST}/klines?symbol=${t.symbol}&interval=1h&limit=15`);
        if (!res.ok) return { symbol: t.symbol, rsi: 50 };
        const data: string[][] = await res.json();
        return { symbol: t.symbol, rsi: calcRSI(data.map((k) => parseFloat(k[4]))) };
      } catch { return { symbol: t.symbol, rsi: 50 }; }
    }));
    const rsiMap = new Map(klinesResults.map((k) => [k.symbol, k.rsi]));

    const map = new Map<string, AugmentedCoin>();
    for (const t of tickers) {
      const baseAsset = t.symbol.replace(/USDT|USDC|BUSD|FDUSD$/, "");
      const change = parseFloat(t.priceChangePercent);
      const pos = estimatePosition(change);
      map.set(baseAsset, {
        symbol: baseAsset, name: nameMap.get(baseAsset) ?? baseAsset,
        price: parseFloat(t.lastPrice),
        changePercent: change,
        volume: parseFloat(t.quoteVolume),
        rsi: rsiMap.get(t.symbol) ?? 50,
        position: pos.position, score: pos.score,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

async function removeFromWatchlist(symbol: string) {
  await fetch(`/api/watchlist?symbol=${symbol}`, { method: "DELETE" });
}

async function fetchItems(): Promise<{ symbol: string; name: string }[]> {
  try {
    const res = await fetch("/api/watchlist");
    if (!res.ok) return [];
    const json = await res.json();
    return json.items ?? [];
  } catch {
    return [];
  }
}

export default function WatchlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, dir } = useI18n();
  const [items, setItems] = useState<{ symbol: string; name: string }[]>([]);
  const [augmented, setAugmented] = useState<Map<string, AugmentedCoin>>(new Map());
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/watchlist")}`);
    }
  }, [status, router]);

  // Initial load + refetch on window focus
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    mountedRef.current = true;

    async function load() {
      setLoading(true);
      const fetched = await fetchItems();
      if (cancelled || !mountedRef.current) return;
      setItems(fetched);

      const symbols = fetched.map((i) => i.symbol);
      if (symbols.length === 0) {
        setLoading(false);
        return;
      }
      const map = await fetchAugmentedBatch(fetched);
      if (cancelled || !mountedRef.current) return;
      setAugmented(map);
      setLoading(false);
    }

    load();

    const onFocus = () => { if (mountedRef.current) load(); };
    const onWatchlistChange = () => { if (mountedRef.current) load(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("watchlist-changed", onWatchlistChange);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("watchlist-changed", onWatchlistChange);
    };
  }, [status]);

  // While checking auth, show nothing
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, the redirect effect above handles it
  if (status !== "authenticated") return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{t("watchlist.title")}</h2>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
              {t("coin_detail.back")}
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <SearchBar />
        </div>

        {loading ? (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_0.5fr] gap-2 px-4 py-3 text-xs font-medium text-gray-400 border-b border-gray-800">
                <span>
                  {t("table.columns.name")}
                </span>
                <span className="text-right">{t("table.columns.price")}</span>
                <span className="text-right">{t("table.columns.24h_pct")}</span>
                <span className="text-right">{t("table.columns.rsi")}</span>
                <span className="text-center">{t("table.columns.signal")}</span>
                <span className="text-center">{t("table.columns.risk")}</span>
              </div>
              <Skeleton rows={5} />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">{t("watchlist.empty")}</p>
          </div>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_0.5fr] gap-2 px-4 py-3 text-xs font-medium text-gray-400 border-b border-gray-800">
                <span>
                  {t("table.columns.name")}
                </span>
                <span className="text-right">{t("table.columns.price")}</span>
                <span className="text-right">{t("table.columns.24h_pct")}</span>
                <span className="text-right">{t("table.columns.rsi")}</span>
                <span className="text-center">{t("table.columns.signal")}</span>
                <span className="text-center">{t("table.columns.risk")}</span>
              </div>

              <div className="divide-y divide-gray-800/50">
                {items.map((item) => {
                  const aug = augmented.get(item.symbol);
                  if (!aug) return null;

                  const isPositive = aug.changePercent >= 0;
                  const rsiColor =
                    aug.rsi > 70 ? "text-red-400" :
                      aug.rsi > 60 ? "text-orange-400" :
                        aug.rsi < 30 ? "text-emerald-400" :
                          aug.rsi < 40 ? "text-cyan-400" : "text-gray-300";

                  const riskScore = aug.score >= 85 ? 1 : aug.score >= 65 ? 0.75 : aug.score >= 40 ? 0.5 : 0.25;
                  const riskColor =
                    riskScore >= 0.75 ? "text-emerald-400 bg-emerald-900/20" :
                      riskScore >= 0.5 ? "text-yellow-400 bg-yellow-900/20" :
                        "text-red-400 bg-red-900/20";

                  const posConfig: Record<string, { text: string; bg: string; labelKey: string }> = {
                    long: { text: "text-emerald-400", bg: "bg-emerald-900/30", labelKey: "coin_row.long" },
                    short: { text: "text-red-400", bg: "bg-red-900/30", labelKey: "coin_row.short" },
                    neutral: { text: "text-yellow-400", bg: "bg-yellow-900/30", labelKey: "coin_row.neutral" },
                  };
                  const pc = posConfig[aug.position];
                  const trendIcon = aug.changePercent >= 0 ? "▲" : "▼";
                  const trendColor = aug.changePercent >= 0 ? "text-emerald-400" : "text-red-400";

                  return (
                    <Link key={item.symbol} href={`/coin/${item.symbol}`} className="group relative block hover:bg-gray-800/30 transition-colors border-b border-gray-800/50 last:border-0">
                      <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_0.5fr] gap-2 items-center px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://assets.coincap.io/assets/icons/${aug.symbol.toLowerCase()}@2x.png`}
                            alt={aug.symbol}
                            className="w-6 h-6 rounded-full shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0 hidden">
                            {aug.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-medium text-white">{aug.symbol}</span>
                            {item.name && item.name !== item.symbol && (
                              <span className={`text-gray-400 ${dir === "rtl" ? "mr-1.5" : "ml-1.5"} text-xs`}>{item.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono text-sm text-white">
                          ${aug.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </div>

                        <div className="text-right font-mono text-sm">
                          <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                            {isPositive ? "+" : ""}{aug.changePercent.toFixed(2)}%
                          </span>
                        </div>

                        <div className={`text-right font-mono text-xs ${rsiColor}`}>
                          {aug.rsi}
                        </div>

                        <div className="flex items-center gap-1.5 justify-center">
                          <span className={`text-[10px] ${trendColor}`}>{trendIcon}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>
                            {t(pc.labelKey)}
                          </span>
                          <span className="text-[10px] font-bold text-white w-5 text-right">{aug.score.toFixed(0)}</span>
                        </div>

                        <div className="text-center">
                          <span className={`inline-flex items-center justify-center w-12 px-1.5 py-0.5 rounded text-[10px] font-bold ${riskColor}`}>
                            {riskScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFromWatchlist(item.symbol).then(() => setItems((prev) => prev.filter((i) => i.symbol !== item.symbol)));
                        }}
                        className={`absolute ${dir === "rtl" ? "left-2" : "right-2"} top-1/2 -translate-y-1/2 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/40`}
                      >
                        ✕
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

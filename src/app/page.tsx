"use client";

import { fetchKlines } from "@/api/binance";
import { CoinImage } from "@/components/CoinImage";
import MarketCapChart from "@/components/MarketCapChart";
import { Sparkline } from "@/components/Sparkline";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface FngSnapshot {
  value: number;
  classification: string;
}

interface CoinCardData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change: number;
  weeklyClose: number[];
}

const TOP_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg", symbolB: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", symbolB: "ETHUSDT" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", image: "https://cryptologos.cc/logos/bnb-bnb-logo.svg", symbolB: "BNBUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", image: "https://cryptologos.cc/logos/solana-sol-logo.svg", symbolB: "SOLUSDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", image: "https://cryptologos.cc/logos/xrp-xrp-logo.svg", symbolB: "XRPUSDT" },
];

function fngColor(value: number): string {
  if (value <= 25) return "#ef4444";
  if (value <= 45) return "#f97316";
  if (value <= 55) return "#eab308";
  if (value <= 75) return "#22c55e";
  return "#16a34a";
}

function formatCompact(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function formatPrice(n: number): string {
  if (n >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

export default function MarketOverviewPage() {
  const { loadFromBinance, isLive, indicators, coins } = useStore();
  const { t } = useI18n();
  useBinanceWebSocket();

  const [fng, setFng] = useState<FngSnapshot | null>(null);
  const [weeklyData, setWeeklyData] = useState<Record<string, number[]>>({});
  const [mcDays, setMcDays] = useState<30 | 365 | 0>(30);
  const [mcData, setMcData] = useState<{ timestamp: number; value: number; volume: number }[]>([]);
  const [mcLoading, setMcLoading] = useState(false);

  useEffect(() => {
    loadFromBinance();

    const end = Math.floor(Date.now() / 1000);
    const start7d = end - 7 * 86400;
    const start1y = end - 365 * 86400;

    Promise.all([
      fetch(`/api/fear-greed?start=${start7d}&end=${end}`).then((r) => r.json()).catch(() => null),
      Promise.all(
        TOP_COINS.map((coin) =>
          fetchKlines(coin.symbolB, "1h", 168)
            .then((klines) => ({ id: coin.id, closes: klines.map((k) => k.close) }))
            .catch(() => ({ id: coin.id, closes: [] }))
        )
      ),
    ]).then(([fngJson, klineResults]) => {
      if (fngJson?.data?.historicalValues?.now) {
        setFng({
          value: fngJson.data.historicalValues.now.score,
          classification: fngJson.data.historicalValues.now.name,
        });
      }
      const map: Record<string, number[]> = {};
      for (const r of klineResults) map[r.id] = r.closes;
      setWeeklyData(map);
    });
  }, [loadFromBinance]);

  useEffect(() => {
    setMcLoading(true);
    const dominance = indicators.btcDominance || 55;
    const totalVol24h = indicators.totalVolume24h || 0;
    let cancelled = false;

    const interval = mcDays === 0 ? "1w" : "1d";
    const limit = mcDays === 0 ? 520 : mcDays;

    fetchKlines("BTCUSDT", interval, limit)
      .then((klines) => {
        if (cancelled) return;
        const BTC_SUPPLY = 19700000;
        const btcPriceNow = klines.length > 0 ? klines[klines.length - 1].close : 0;
        const btcVolNow = klines.length > 0 ? klines[klines.length - 1].volume : 0;
        const ratio = btcVolNow > 0 ? totalVol24h / btcVolNow : 0;
        const data = klines.map((k) => {
          const btcMc = k.close * BTC_SUPPLY;
          const totalMc = btcMc / (dominance / 100);
          const totalVol = k.volume * ratio;
          return { timestamp: Math.floor(k.timestamp / 1000), value: totalMc, volume: totalVol };
        });
        setMcData(data);
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setMcLoading(false); });

    return () => { cancelled = true; };
  }, [mcDays, indicators.btcDominance, indicators.totalVolume24h]);

  const longCount = useMemo(() => coins.filter((c) => c.position === "long").length, [coins]);
  const shortCount = useMemo(() => coins.filter((c) => c.position === "short").length, [coins]);
  const coinCards: CoinCardData[] = useMemo(() => {
    return TOP_COINS.map((tc) => {
      const coin = coins.find((c) => c.coinId === tc.id);
      return {
        id: tc.id,
        symbol: tc.symbol,
        name: tc.name,
        image: tc.image,
        price: coin?.marketData.currentPrice ?? 0,
        change: coin?.marketData.priceChangePercent24h ?? 0,
        weeklyClose: weeklyData[tc.id] ?? [],
      };
    });
  }, [coins, weeklyData]);

  const dominanceSegments = useMemo(() => {
    const total = indicators.totalMarketCap || 1;
    return [
      { label: "BTC", value: indicators.btcDominance, color: "#f7931a" },
      { label: "ETH", value: indicators.ethDominance, color: "#8b8cf7" },
      { label: "BNB", value: indicators.bnbDominance, color: "#f0b90b" },
      { label: "Others", value: indicators.othersDominance, color: "#6b7280" },
    ];
  }, [indicators]);

  const navCards = [
    {
      href: "/coins",
      title: t("nav.coins"),
      desc: "Browse and analyze all tracked coins",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      ),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      href: "/treemap",
      title: t("nav.treemap"),
      desc: "Visualize market by cap and price change",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="4" /><rect x="14" y="10" width="7" height="11" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      href: "/indicators",
      title: t("nav.indicators"),
      desc: "Market indicators and coin screener",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
        </svg>
      ),
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      href: "/fear-greed",
      title: t("nav.fear_greed"),
      desc: "Market sentiment and historical data",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      ),
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <DashboardLayout>
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{t("overview.title")}</h2>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("header.live")}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">{t("overview.subtitle")}</p>
        </div>

        {/* Top 5 Coins */}
        <div className="mb-8">
          {/* Mobile: BTC full width, rest 2-col */}
          <div className="lg:hidden">
            {coinCards.slice(0, 1).map((coin) => {
              const isPositive = coin.change >= 0;
              const sparkColor = isPositive ? "#22c55e" : "#ef4444";
              return (
                <Link
                  key={coin.id}
                  href={`/coin/${coin.id}`}
                  className="block group bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 hover:border-gray-700 transition-all overflow-hidden mb-3"
                >
                  <div className="p-3.5 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CoinImage src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full shrink-0" size={32} />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">{coin.symbol}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{coin.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">${formatPrice(coin.price)}</p>
                        <p className={`text-[11px] font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{coin.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Sparkline
                      data={coin.weeklyClose.map((c) => ({ close: c }))}
                      color={sparkColor}
                      height={56}
                    />
                  </div>
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-3">
              {coinCards.slice(1).map((coin) => {
                const isPositive = coin.change >= 0;
                const sparkColor = isPositive ? "#22c55e" : "#ef4444";
                return (
                  <Link
                    key={coin.id}
                    href={`/coin/${coin.id}`}
                    className="group bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 hover:border-gray-700 transition-all overflow-hidden"
                  >
                    <div className="p-3.5 pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CoinImage src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full shrink-0" size={32} />
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">{coin.symbol}</p>
                            <p className="text-[10px] text-gray-500 leading-tight">{coin.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">${formatPrice(coin.price)}</p>
                          <p className={`text-[11px] font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? "+" : ""}{coin.change.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1">
                      <Sparkline
                        data={coin.weeklyClose.map((c) => ({ close: c }))}
                        color={sparkColor}
                        height={48}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* Desktop: all 5 in a row */}
          <div className="hidden lg:grid lg:grid-cols-5 gap-3">
            {coinCards.map((coin) => {
              const isPositive = coin.change >= 0;
              const sparkColor = isPositive ? "#22c55e" : "#ef4444";
              return (
                <Link
                  key={coin.id}
                  href={`/coin/${coin.id}`}
                  className="group bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800/50 hover:border-gray-700 transition-all overflow-hidden"
                >
                  <div className="p-3.5 pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CoinImage src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full shrink-0" size={32} />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">{coin.symbol}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{coin.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">${formatPrice(coin.price)}</p>
                        <p className={`text-[11px] font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{coin.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Sparkline
                      data={coin.weeklyClose.map((c) => ({ close: c }))}
                      color={sparkColor}
                      height={56}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label={t("overview.total_mcap")}
            value={formatCompact(indicators.totalMarketCap)}
            change={`${indicators.btcDominance.toFixed(1)}% BTC`}
          />
          <MetricCard
            label={t("overview.volume_24h")}
            value={formatCompact(indicators.totalVolume24h)}
          />
          <MetricCard
            label={t("overview.btc_d")}
            value={`${indicators.btcDominance.toFixed(1)}%`}
            sub={`${longCount} ${t("overview.long_signals")}`}
          />
          <MetricCard
            label={t("overview.eth_d")}
            value={`${indicators.ethDominance.toFixed(1)}%`}
            sub={`${shortCount} ${t("overview.short_signals")}`}
          />
        </div>

        {/* Market Cap Distribution + Fear & Greed + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Market Cap Distribution */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 mb-4">{t("overview.dominance_title")}</h3>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden flex">
              {dominanceSegments.map((seg) => (
                <div
                  key={seg.label}
                  style={{ width: `${seg.value}%`, backgroundColor: seg.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {dominanceSegments.map((seg) => (
                <div key={seg.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-xs text-gray-400">{seg.label}</span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5">{seg.value.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fear & Greed Snapshot */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">{t("overview.fear_greed")}</h3>
            {fng ? (
              <>
                <div className="text-5xl font-black mb-1" style={{ color: fngColor(fng.value) }}>
                  {fng.value}
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    color: fngColor(fng.value),
                    backgroundColor: `${fngColor(fng.value)}1a`,
                    border: `1px solid ${fngColor(fng.value)}33`,
                  }}
                >
                  {fng.classification}
                </span>
              </>
            ) : (
              <div className="text-sm text-gray-500">{t("overview.loading_fng")}</div>
            )}
          </div>
        </div>

        {/* Crypto Market Cap Chart */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 sm:p-5 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 sm:mb-5">
            <h3 className="text-sm font-semibold text-white shrink-0">{t("overview.mcap_chart")}</h3>
            <div className="flex gap-1 flex-wrap">
              {([30, 365, 0] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setMcDays(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${mcDays === d
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/50"
                    }`}
                >
                  {d === 0 ? t("overview.mcap_all") : d === 365 ? t("overview.mcap_1y") : t("overview.mcap_30d")}
                </button>
              ))}
            </div>
          </div>
          {mcLoading || mcData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">
              {t("overview.loading_fng")}
            </div>
          ) : (
            <div className="h-[220px] sm:h-[280px]">
              <MarketCapChart mcData={mcData} mcDays={mcDays} />
            </div>
          )}
        </div>

        {/* Navigation Cards */}
        <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("overview.quick_nav")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:bg-gray-800/50 hover:border-gray-700 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3 ${card.color}`}>
                {card.icon}
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{card.title}</h4>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">{card.desc}</p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-[10px] text-gray-600 text-right">
          {t("overview.footnote")}
        </p>
    </DashboardLayout>
  );
}

function MetricCard({ label, value, change, sub }: { label: string; value: string; change?: string; sub?: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && <p className="text-xs text-gray-500 mt-0.5">{change}</p>}
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

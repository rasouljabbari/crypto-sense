"use client";

import { CoinVolumeData } from "@/api/binance";
import { Header } from "@/components/Header";
import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function IndicatorsPage() {
  const { loadFromBinance, indicators, isLive } = useStore();
  const { t, dir } = useI18n();
  useBinanceWebSocket();

  const [screenData, setScreenData] = useState<CoinVolumeData[]>([]);
  const [screenLoading, setScreenLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>("priceChangePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadFromBinance();
  }, [loadFromBinance]);

  useEffect(() => {
    const load = async () => {
      const mod = await import("@/api/binance");
      const data = await mod.fetchCoinVolumeScreen();
      setScreenData(data);
      setScreenLoading(false);
    };
    load();
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "baseAsset" || key === "coinId" ? "asc" : "desc");
      return key;
    });
  }, []);

  const sorted = [...screenData].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "baseAsset": return dir * a.baseAsset.localeCompare(b.baseAsset);
      case "price": return dir * (a.price - b.price);
      case "priceChangePercent": return dir * (a.priceChangePercent - b.priceChangePercent);
      case "volumeBtc": return dir * (a.volumeBtc - b.volumeBtc);
      default: return 0;
    }
  });

  const rows = [
    { label: t("indicators.rows.total"), key: "totalMarketCap" as const, format: "marketCap" },
    { label: t("indicators.rows.total2"), key: "totalExBtc" as const, format: "marketCap" },
    { label: t("indicators.rows.total3"), key: "totalExTop10" as const, format: "marketCap" },
    { label: t("indicators.rows.btc_d"), key: "btcDominance" as const, format: "percent" },
    { label: t("indicators.rows.eth_d"), key: "ethDominance" as const, format: "percent" },
    { label: t("indicators.rows.bnb_d"), key: "bnbDominance" as const, format: "percent" },
    { label: t("indicators.rows.usdt_d"), key: "usdtDominance" as const, format: "percent" },
    { label: t("indicators.rows.others_d"), key: "othersDominance" as const, format: "percent" },
    { label: t("indicators.rows.eth_btc"), key: "ethBtcRatio" as const, format: "ratio" },
    { label: t("indicators.rows.bnb_btc"), key: "bnbBtcRatio" as const, format: "ratio" },
    { label: t("indicators.rows.volume_24h"), key: "totalVolume24h" as const, format: "marketCap" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("indicators.back")}
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{t("indicators.title")}</h2>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("indicators.live")}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            {t("indicators.subtitle")}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-[3fr_1fr_auto] gap-2 px-4 py-3 text-xs font-medium text-gray-400 border-b border-gray-800">
            <span>{t("indicators.columns.indicator")}</span>
            <span className="text-right">{t("indicators.columns.value")}</span>
            <span className="text-right w-16">{t("indicators.columns.signal")}</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {rows.map((row) => {
              const value = indicators[row.key] as number;
              const formatted = formatValue(value, row.format);
              const signal = getIndicatorSignal(row.key, value, t);
              return (
                <div key={row.key} className="grid grid-cols-[3fr_1fr_auto] gap-2 items-center px-4 py-3 text-sm hover:bg-gray-800/30 transition-colors">
                  <span className="text-gray-200">{row.label}</span>
                  <span className="text-right font-mono text-white">{formatted}</span>
                  <span className={`text-right text-xs font-semibold w-16 px-2 py-0.5 rounded ${signal.color}`}>
                    {signal.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-[10px] text-gray-600 text-right leading-relaxed">
          {t("indicators.footnote")}
          {!isLive && ` · ${t("indicators.estimated")}`}
        </p>

        {/* ─── Coin Volume Screener (≥ 1000 BTC 24h vol) ─── */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-white">{t("indicators.screener.title")}</h3>
            <span className="text-[10px] text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">
              {t("indicators.screener.filter_vol")}
            </span>
          </div>

          {screenLoading ? (
            <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-6 text-center text-sm text-gray-500">
              {t("indicators.screener.loading")}
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-6 text-center text-sm text-gray-500">
              {t("indicators.screener.empty")}
            </div>
          ) : (
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-2 px-4 py-2.5 text-[10px] font-medium text-gray-500 border-b border-gray-800">
                <SortHeader label={t("indicators.screener.col_pair")} sortKey="baseAsset" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label={t("indicators.screener.col_price")} sortKey="price" currentKey={sortKey} dir={sortDir} onClick={toggleSort} className="text-right" />
                <SortHeader label={t("indicators.screener.col_chg")} sortKey="priceChangePercent" currentKey={sortKey} dir={sortDir} onClick={toggleSort} className="text-right" />
                <SortHeader label={t("indicators.screener.col_vol")} sortKey="volumeBtc" currentKey={sortKey} dir={sortDir} onClick={toggleSort} className="text-right" />
              </div>
              <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
                {sorted.slice(0, 100).map((c) => {
                  const chg = c.priceChangePercent;
                  const chgColor = chg >= 0 ? "text-emerald-400" : "text-red-400";
                  return (
                    <div key={c.baseAsset} className="grid grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-2 items-center px-4 py-2.5 text-xs hover:bg-gray-800/30 transition-colors">
                      <div>
                        {c.coinId ? (
                          <Link href={`/coin/${c.coinId}`} className="text-white font-medium hover:text-cyan-400 transition-colors">
                            {c.baseAsset}
                          </Link>
                        ) : (
                          <span className="text-gray-400">{c.baseAsset}</span>
                        )}
                      </div>
                      <span className="text-right font-mono text-white">${c.price < 1 ? c.price.toFixed(4) : c.price.toFixed(2)}</span>
                      <span className={`text-right font-mono font-semibold ${chgColor}`}>
                        {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                      </span>
                      <span className="text-right font-mono text-gray-300">{c.volumeBtc.toFixed(0)} <span className="text-gray-600">BTC</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2 text-[10px] text-gray-600 border-t border-gray-800 text-right">
                {t("indicators.screener.footer", { count: screenData.length })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, dir, onClick, className }: {
  label: string; sortKey: string; currentKey: string; dir: "asc" | "desc"; onClick: (k: string) => void; className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <button onClick={() => onClick(sortKey)} className={`inline-flex items-center gap-1 hover:text-gray-200 transition-colors ${className ?? ""} ${isActive ? "text-gray-200" : ""}`}>
      {label}
      {isActive && <span className="text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

function formatValue(value: number, format: string): string {
  if (format === "marketCap") {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  }
  if (format === "percent") return `${value.toFixed(2)}%`;
  if (format === "ratio") return value.toFixed(6);
  return value.toFixed(2);
}

function getIndicatorSignal(key: string, value: number, t: (path: string) => string): { label: string; color: string } {
  switch (key) {
    case "btcDominance":
      if (value > 65) return { label: t("indicators.signals.risk_off"), color: "text-yellow-400 bg-yellow-900/20" };
      if (value < 40) return { label: t("indicators.signals.risk_on"), color: "text-emerald-400 bg-emerald-900/20" };
      return { label: t("indicators.signals.neutral"), color: "text-gray-400 bg-gray-800" };
    case "ethDominance":
      if (value > 18) return { label: t("indicators.signals.strong"), color: "text-emerald-400 bg-emerald-900/20" };
      if (value < 8) return { label: t("indicators.signals.weak"), color: "text-red-400 bg-red-900/20" };
      return { label: t("indicators.signals.stable"), color: "text-yellow-400 bg-yellow-900/20" };
    case "usdtDominance":
      if (value > 7) return { label: t("indicators.signals.caution"), color: "text-red-400 bg-red-900/20" };
      if (value < 2) return { label: t("indicators.signals.risk_on"), color: "text-emerald-400 bg-emerald-900/20" };
      return { label: t("indicators.signals.normal"), color: "text-yellow-400 bg-yellow-900/20" };
    case "ethBtcRatio":
      if (value > 0.07) return { label: t("indicators.signals.eth_up"), color: "text-emerald-400 bg-emerald-900/20" };
      if (value < 0.025) return { label: t("indicators.signals.btc_up"), color: "text-cyan-400 bg-cyan-900/20" };
      return { label: t("indicators.signals.flat"), color: "text-gray-400 bg-gray-800" };
    case "totalMarketCap":
      if (value > 3e12) return { label: t("indicators.signals.bullish"), color: "text-emerald-400 bg-emerald-900/20" };
      if (value < 1.5e12) return { label: t("indicators.signals.bearish"), color: "text-red-400 bg-red-900/20" };
      return { label: t("indicators.signals.neutral"), color: "text-yellow-400 bg-yellow-900/20" };
    case "othersDominance":
      if (value > 20) return { label: t("indicators.signals.altseason"), color: "text-emerald-400 bg-emerald-900/20" };
      if (value < 10) return { label: t("indicators.signals.btc_season"), color: "text-cyan-400 bg-cyan-900/20" };
      return { label: t("indicators.signals.neutral"), color: "text-yellow-400 bg-yellow-900/20" };
    default:
      return { label: t("indicators.signals.none"), color: "text-gray-500 bg-transparent" };
  }
}

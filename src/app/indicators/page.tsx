"use client";

import { Header } from "@/components/Header";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import { useEffect } from "react";

function formatCompact(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toFixed(0);
}

function formatPercent(n: number): string {
  return n.toFixed(2) + "%";
}

function formatChange(v: number | undefined): string {
  if (v === undefined || v === null) return "";
  const sign = v >= 0 ? "+" : "";
  return sign + v.toFixed(2) + "%";
}

function changeClass(v: number | undefined): string {
  if (v === undefined || v === null) return "text-gray-400";
  return v >= 0 ? "text-green-400" : "text-red-400";
}

export default function IndicatorsPage() {
  const { indicators, loadFromBinance } = useStore();
  useBinanceWebSocket();

  useEffect(() => {
    loadFromBinance();
  }, [loadFromBinance]);

  const capRows = [
    { label: "TOTAL (Total Crypto Market Cap)", key: "totalMarketCap" as const, fmt: formatCompact, chgKey: "totalMarketCap" as const },
    { label: "TOTAL2 (Total ex BTC)", key: "totalExBtc" as const, fmt: formatCompact, chgKey: "totalExBtc" as const },
    { label: "TOTAL3 (Total ex BTC & ETH)", key: "totalExTop10" as const, fmt: formatCompact, chgKey: "totalExTop10" as const },
  ];

  const domRows = [
    { label: "BTC.D", key: "btcDominance" as const, fmt: formatPercent, chgKey: "btcDominance" as const },
    { label: "ETH.D", key: "ethDominance" as const, fmt: formatPercent, chgKey: "ethDominance" as const },
    { label: "USDT.D", key: "usdtDominance" as const, fmt: formatPercent, chgKey: "usdtDominance" as const },
    { label: "OTHERS.D", key: "othersDominance" as const, fmt: formatPercent, chgKey: "othersDominance" as const },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Market Indicators</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Market Cap</h3>
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-800/50">
                {capRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <span className="text-gray-300 text-sm">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-right font-mono text-white text-lg font-bold tabular-nums">
                        {row.fmt(indicators[row.key])}
                      </span>
                      {indicators.change && (
                        <span className={`font-mono text-xs tabular-nums ${changeClass(indicators.change[row.chgKey])}`}>
                          {formatChange(indicators.change[row.chgKey])}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Dominance</h3>
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-800/50">
                {domRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-5 py-4 hover:bg-gray-800/30 transition-colors">
                    <span className="text-gray-300 text-sm">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-right font-mono text-white text-lg font-bold tabular-nums">
                        {row.fmt(indicators[row.key])}
                      </span>
                      {indicators.change && (
                        <span className={`font-mono text-xs tabular-nums ${changeClass(indicators.change[row.chgKey])}`}>
                          {formatChange(indicators.change[row.chgKey])}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { CoinTable } from "@/components/CoinTable";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import { useI18n } from "@/i18n/context";

export default function DashboardPage() {
  const { loadFromBinance, isLive, coins } = useStore();
  const { t } = useI18n();
  useBinanceWebSocket();

  useEffect(() => {
    loadFromBinance();
  }, [loadFromBinance]);

  const longCount = coins.filter((c) => c.position === "long").length;
  const shortCount = coins.filter((c) => c.position === "short").length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{t("dashboard.title")}</h2>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("header.live")}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label={t("dashboard.stats.total_coins")} value="15" />
          <StatCard label={t("dashboard.stats.long_opportunities")} value={longCount.toString()} gradient="from-emerald-500 to-emerald-600" />
          <StatCard label={t("dashboard.stats.short_opportunities")} value={shortCount.toString()} gradient="from-red-500 to-red-600" />
          <StatCard label={t("dashboard.stats.data_source")} value={isLive ? t("dashboard.stats.binance_api") : t("dashboard.stats.simulated")} />
        </div>

        <CoinTable />
      </main>
    </div>
  );
}

function StatCard({ label, value, gradient }: { label: string; value: string; gradient?: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${gradient ? `bg-gradient-to-r ${gradient} bg-clip-text text-transparent` : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

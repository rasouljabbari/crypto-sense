"use client";

import { CoinTable } from "@/components/CoinTable";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import { useEffect } from "react";

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

      <main className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <StatCard label={t("dashboard.stats.total_coins")} value={coins.length.toString()} icon={<CoinsIcon />} />
          <StatCard label={t("dashboard.stats.long_opportunities")} value={longCount.toString()} gradient="from-emerald-500 to-emerald-600" icon={<LongIcon />} />
          <StatCard label={t("dashboard.stats.short_opportunities")} value={shortCount.toString()} gradient="from-red-500 to-red-600" icon={<ShortIcon />} />
          <StatCard label={t("dashboard.stats.data_source")} value={isLive ? t("dashboard.stats.binance_api") : t("dashboard.stats.simulated")} icon={<BinanceIcon />} />
        </div>

        <div className="mb-6">
          <SearchBar />
        </div>

        <CoinTable />
      </main>
    </div>
  );
}

function StatCard({ label, value, gradient, icon }: { label: string; value: string; gradient?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
      {icon && (
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800/60 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${gradient ? `bg-gradient-to-r ${gradient} bg-clip-text text-transparent` : "text-white"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function CoinsIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </svg>
  );
}

function LongIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="none">
      <rect x="6" y="14" width="4" height="7" rx="1" fill="#34d399" opacity="0.9" />
      <rect x="14" y="7" width="4" height="14" rx="1" fill="#34d399" opacity="0.9" />
      <path d="M12 2l3 4h-2v6h-2V6H9l3-4z" fill="#34d399" />
    </svg>
  );
}

function ShortIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="none">
      <rect x="6" y="3" width="4" height="7" rx="1" fill="#f87171" opacity="0.9" />
      <rect x="14" y="3" width="4" height="14" rx="1" fill="#f87171" opacity="0.9" />
      <path d="M12 22l-3-4h2v-6h2v6h2l-3 4z" fill="#f87171" />
    </svg>
  );
}

function BinanceIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#f0b90b">
      <path d="M7.5 12L4.5 9l3-3 3 3-3 3zM12 7.5L9 4.5l3-3 3 3-3 3zM16.5 12l-3-3 3-3 3 3-3 3zM12 16.5l-3-3 3-3 3 3-3 3zM7.5 12l-3 3 3 3 3-3-3-3zM16.5 12l-3 3 3 3 3-3-3-3zM12 4.5l-3 3 3 3 3-3-3-3z" />
      <path d="M7.5 19.5l-3-3 3-3 3 3-3 3zM16.5 19.5l-3-3 3-3 3 3-3 3zM12 21l-3-3 3-3 3 3-3 3z" opacity="0.6" />
    </svg>
  );
}

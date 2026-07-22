"use client";

import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useMemo, useState } from "react";
import { CoinRow } from "./CoinRow";
import { FilterBar } from "./FilterBar";

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-600 ml-0.5">↕</span>;
  return <span className="text-emerald-400 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function CoinTable() {
  const { filteredCoins, coins, filters, setFilters } = useStore();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const longCount = coins.filter((c) => c.position === "long").length;
  const shortCount = coins.filter((c) => c.position === "short").length;
  const neutralCount = coins.filter((c) => c.position === "neutral").length;

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return filteredCoins;
    const q = searchQuery.toLowerCase();
    return filteredCoins.filter(
      (c) =>
        c.marketData.name.toLowerCase().includes(q) ||
        c.marketData.symbol.toLowerCase().includes(q)
    );
  }, [filteredCoins, searchQuery]);

  function toggleSort(col: string) {
    if (filters.sortBy === col) {
      setFilters({ sortOrder: filters.sortOrder === "desc" ? "asc" : "desc" });
    } else {
      setFilters({ sortBy: col as typeof filters.sortBy, sortOrder: col === "name" ? "asc" : "desc" });
    }
  }

  const headerClass = "flex items-center gap-0.5 hover:text-gray-200 transition-colors cursor-pointer select-none w-full";
  const headerText = "text-[11px] font-medium text-gray-400";

  return (
    <div className="space-y-4">
      <FilterBar />

      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {/* Market Overview header row */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-800 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">{t("table.market_overview")}</h2>
            <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-400">{t("table.legend_long")}</span>
                <span className="text-emerald-400 font-medium">{longCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-400">{t("table.legend_short")}</span>
                <span className="text-red-400 font-medium">{shortCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-gray-400">{t("table.legend_neutral")}</span>
                <span className="text-yellow-400 font-medium">{neutralCount}</span>
              </span>
            </div>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 w-48 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-500"
          />
        </div>

        <div className="overflow-x-auto">
          <div>
            {/* Header */}
            <div className="grid grid-cols-[2fr_repeat(7,1fr)] gap-1 items-center px-3 py-3 border-b border-gray-800 sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm">
              <span className={headerText}>{t("table.columns.name")}</span>

              <button onClick={() => toggleSort("recommendation")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.opportunity")}</span>
                <SortIcon active={filters.sortBy === "recommendation"} dir={filters.sortOrder} />
              </button>

              <button onClick={() => toggleSort("signal")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.signal")}</span>
                <SortIcon active={filters.sortBy === "signal"} dir={filters.sortOrder} />
              </button>

              <button onClick={() => toggleSort("confidence")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.confidence")}</span>
                <SortIcon active={filters.sortBy === "confidence"} dir={filters.sortOrder} />
              </button>

              <button onClick={() => toggleSort("tradeQuality")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.trade_quality")}</span>
                <SortIcon active={filters.sortBy === "tradeQuality"} dir={filters.sortOrder} />
              </button>

              <button onClick={() => toggleSort("trend")} className={`${headerClass} justify-start`}>
                <span className={headerText}>{t("table.columns.trend")}</span>
                <SortIcon active={filters.sortBy === "trend"} dir={filters.sortOrder} />
              </button>

              <span className={`${headerText} text-right`}>{t("table.columns.price")}</span>

              <button onClick={() => toggleSort("priceChange")} className={`${headerClass} justify-start`}>
                <span className={headerText}>{t("table.columns.24h_pct")}</span>
                <SortIcon active={filters.sortBy === "priceChange"} dir={filters.sortOrder} />
              </button>
            </div>

            <div className="divide-y divide-gray-800/50">
              {searched.map((coin) => (
                <CoinRow key={coin.coinId} coin={coin} />
              ))}
            </div>

            {searched.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? t("search.no_results") : t("table.empty")}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-600 text-right">
        {t("table.showing", { visible: searched.length, total: coins.length })}
      </p>
    </div>
  );
}

"use client";

import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { CoinRow } from "./CoinRow";
import { FilterBar } from "./FilterBar";
import { useMemo, useState } from "react";

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

  return (
    <div className="space-y-4">
      <FilterBar />

      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {/* Market Overview header row */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-800 flex-wrap">
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
            placeholder="Search coins..."
            className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 w-48 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-500"
          />
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] grid grid-cols-[2fr_1.2fr_0.5fr_1fr_1fr_1fr] gap-2 px-4 py-3 text-xs font-medium text-gray-400 border-b border-gray-800">
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-gray-600">#</span>
              {t("table.columns.name")}
            </span>
            <button onClick={() => toggleSort("position")} className="flex items-center text-left hover:text-gray-200 transition-colors">
              {t("table.columns.signal")}
              <SortIcon active={filters.sortBy === "position"} dir={filters.sortOrder} />
            </button>
            <button onClick={() => toggleSort("risk")} className="flex items-center justify-center hover:text-gray-200 transition-colors">
              {t("table.columns.risk")}
              <SortIcon active={filters.sortBy === "risk"} dir={filters.sortOrder} />
            </button>
            <span className="text-right">{t("table.columns.price")}</span>
            <button onClick={() => toggleSort("priceChange")} className="text-right hover:text-gray-200 transition-colors">
              {t("table.columns.24h_pct")}
              <SortIcon active={filters.sortBy === "priceChange"} dir={filters.sortOrder} />
            </button>
            <span className="text-right">{t("table.columns.rsi")}</span>
          </div>

          <div className="divide-y divide-gray-800/50">
            {searched.map((coin) => (
              <CoinRow key={coin.coinId} coin={coin} />
            ))}
          </div>

          {searched.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "No coins match your search" : t("table.empty")}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600 text-right">
        {t("table.showing", { visible: searched.length, total: coins.length })}
      </p>
    </div>
  );
}

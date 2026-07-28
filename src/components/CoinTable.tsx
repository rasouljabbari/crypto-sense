"use client";

import { useI18n } from "@/i18n/context";
import { useSnapshotStore } from "@/store/useAnalysisSnapshot";
import { useTimeframe } from "@/lib/timeframe";
import { useStore } from "@/store/useStore";
import { useMemo, useState } from "react";
import { CoinRow } from "./CoinRow";
import { FilterBar } from "./FilterBar";

function ss(s: string): string { return s.toLowerCase().replace(/\s+/g, "_"); }

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-600 ml-0.5">↕</span>;
  return <span className="text-emerald-400 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function CoinTable() {
  const { timeframe } = useTimeframe();
  const collection = useSnapshotStore((s) => s.collections[timeframe]);
  const entries = useMemo(() => Object.values(collection), [collection]);
  const { filters, setFilters } = useStore();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const longCount = entries.filter((c) => c.tradeSetup.direction === "long").length;
  const shortCount = entries.filter((c) => c.tradeSetup.direction === "short").length;
  const neutralCount = entries.filter((c) => !c.tradeSetup.direction).length;

  const searched = useMemo(() => {
    let list = [...entries];
    // position filter
    if (filters.positionType !== "all") {
      list = list.filter((c) => c.tradeSetup.direction === filters.positionType);
    }
    // min score filter
    if (filters.minScore > 0) {
      list = list.filter((c) => (c.opportunity.confidence ?? 0) >= filters.minScore);
    }
    // sort
    const order = filters.sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (filters.sortBy) {
        case "name": return a.symbol.localeCompare(b.symbol) * order;
        case "recommendation": return (a.opportunity.recommendation < b.opportunity.recommendation ? -1 : 1) * order;
        case "confidence": return (a.opportunity.confidence - b.opportunity.confidence) * order;
        case "trend": return (ss(a.marketState.trend) < ss(b.marketState.trend) ? -1 : 1) * order;
        case "volume": {
          const va = parseFloat(a.marketState.volume.replace(/[^0-9.]/g, "")) || 0;
          const vb = parseFloat(b.marketState.volume.replace(/[^0-9.]/g, "")) || 0;
          return (va - vb) * order;
        }
        case "priceChange": {
          const pa = parseFloat(a.marketState.changePercent24h.replace(/[^0-9.\-]/g, "")) || 0;
          const pb = parseFloat(b.marketState.changePercent24h.replace(/[^0-9.\-]/g, "")) || 0;
          return (pa - pb) * order;
        }
        default: return 0;
      }
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [entries, filters, searchQuery]);

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
            <div className="grid grid-cols-[2fr_repeat(5,1fr)] gap-1 items-center px-3 py-3 border-b border-gray-800 sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm">
              <span className={headerText}>{t("table.columns.name")}</span>

              <button onClick={() => toggleSort("recommendation")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.opportunity")}</span>
                <SortIcon active={filters.sortBy === "recommendation"} dir={filters.sortOrder} />
              </button>

              <button onClick={() => toggleSort("confidence")} className={`${headerClass} justify-center`}>
                <span className={headerText}>{t("table.columns.confidence")}</span>
                <SortIcon active={filters.sortBy === "confidence"} dir={filters.sortOrder} />
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
                <CoinRow key={coin.coin} coin={coin} />
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
        {t("table.showing", { visible: searched.length, total: entries.length })}
      </p>
    </div>
  );
}

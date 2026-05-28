"use client";

import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { CoinRow } from "./CoinRow";
import { FilterBar } from "./FilterBar";

export function CoinTable() {
  const { filteredCoins, coins } = useStore();
  const { t } = useI18n();

  const longCount = coins.filter((c) => c.position === "long").length;
  const shortCount = coins.filter((c) => c.position === "short").length;
  const neutralCount = coins.filter((c) => c.position === "neutral").length;

  return (
    <div className="space-y-4">
      <FilterBar />

      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {/* Market Overview header row — table-like */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 border-b border-gray-800">
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

        <div className="overflow-x-auto">
          <div className="min-w-[640px] grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_0.5fr] gap-2 px-4 py-3 text-xs font-medium text-gray-400 border-b border-gray-800">
            <span className="flex items-center gap-1">
              <span className="text-[9px] text-gray-600">#</span>
              {t("table.columns.name")}
            </span>
            <span className="text-right">{t("table.columns.price")}</span>
            <span className="text-right">{t("table.columns.24h_pct")}</span>
            <span className="text-right">{t("table.columns.rsi")}</span>
            <span className="text-center">{t("table.columns.signal")}</span>
            <span className="text-center">{t("table.columns.risk")}</span>
          </div>

        <div className="divide-y divide-gray-800/50 divide-y divide-gray-800/50">
          {filteredCoins.map((coin) => (
            <CoinRow key={coin.coinId} coin={coin} />
          ))}
        </div>

        {filteredCoins.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t("table.empty")}
          </div>
        )}
      </div>
      </div>

      <p className="text-xs text-gray-600 text-right">
        {t("table.showing", { visible: filteredCoins.length, total: coins.length })}
      </p>
    </div>
  );
}

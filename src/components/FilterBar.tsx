"use client";

import { useStore } from "@/store/useStore";
import { useI18n } from "@/i18n/context";

export function FilterBar() {
  const { filters, setFilters } = useStore();
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">{t("filters.position")}</label>
        <select
          value={filters.positionType}
          onChange={(e) => setFilters({ positionType: e.target.value as "all" | "long" | "short" | "neutral" })}
          className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="all">{t("filters.all")}</option>
          <option value="long">{t("filters.long")}</option>
          <option value="short">{t("filters.short")}</option>
          <option value="neutral">{t("filters.neutral")}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">{t("filters.sort_by")}</label>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ sortBy: e.target.value as "score" | "volume" | "priceChange" | "name" })}
          className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="score">{t("filters.score")}</option>
          <option value="volume">{t("filters.volume")}</option>
          <option value="priceChange">{t("filters.price_change")}</option>
          <option value="name">{t("filters.name")}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">{t("filters.order")}</label>
        <button
          onClick={() => setFilters({ sortOrder: filters.sortOrder === "desc" ? "asc" : "desc" })}
          className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          {filters.sortOrder === "desc" ? t("filters.desc") : t("filters.asc")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">{t("filters.min_score")}</label>
        <input
          type="number"
          min={0}
          max={100}
          value={filters.minScore}
          onChange={(e) => setFilters({ minScore: Number(e.target.value) })}
          className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 w-16 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
}

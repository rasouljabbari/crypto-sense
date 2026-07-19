"use client";

import { useIndicatorManager } from "./useIndicatorManager";
import type { IndicatorId } from "./types";

// ─── Indicator Toolbar ─────────────────────────────────────────────────────
// Compact tab bar for toggling chart indicators.
// Volume is always active (non-interactive).
// RSI and DMI are toggle buttons.

import { useI18n } from "@/i18n/context";

interface IndicatorToolbarProps {
  manager: ReturnType<typeof useIndicatorManager>;
}

const INDICATOR_META: {
  id: IndicatorId;
  labelKey: string;
  color: string;
}[] = [
  { id: "volume", labelKey: "chart.vol_label", color: "text-sky-400" },
  { id: "rsi", labelKey: "chart.rsi_label", color: "text-purple-400" },
  { id: "dmi", labelKey: "chart.dmi_label", color: "text-orange-400" },
];

export function IndicatorToolbar({ manager }: IndicatorToolbarProps) {
  const { t } = useI18n();
  const { toggle, isEnabled } = manager;

  return (
    <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
      <span className="px-2 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider select-none">
        {t("chart.ind_label")}
      </span>
      <div className="w-px h-4 bg-gray-700/50" />
      {INDICATOR_META.map((ind) => {
        const active = isEnabled(ind.id);
        return (
          <button
            key={ind.id}
            onClick={() => toggle(ind.id)}
            className={`
              px-2.5 py-1 text-[11px] font-semibold rounded-md
              transition-all duration-150 ease-out
              select-none whitespace-nowrap
              ${
                active
                  ? `bg-emerald-500/15 ${ind.color} border border-emerald-500/30 shadow-sm shadow-emerald-500/10`
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent"
              }
            `}
            title={
              active
                ? t("chart.hide_indicator", { label: t(ind.labelKey) })
                : t("chart.show_indicator", { label: t(ind.labelKey) })
            }
          >
            {t(ind.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useI18n } from "@/i18n/context";
import { useTimeframe, TIMEFRAME_OPTIONS, type TimeframeOption } from "@/lib/timeframe";

interface Props {
  /** Optional override — if omitted, reads from global context */
  active?: TimeframeOption;
  /** Optional override — if omitted, writes to global context */
  onChange?: (tf: TimeframeOption) => void;
}

export function TimeframeTabs({ active, onChange }: Props) {
  const { t } = useI18n();
  const ctx = useTimeframe();
  const current = active ?? ctx.timeframe;
  const setTf = onChange ?? ctx.setTimeframe;

  return (
    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1 border border-gray-700/50">
      {TIMEFRAME_OPTIONS.map((tab) => {
        const isActive = current === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => setTf(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              isActive
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
            }`}
          >
            {t("timeframe.short_" + tab.value)}
          </button>
        );
      })}
    </div>
  );
}

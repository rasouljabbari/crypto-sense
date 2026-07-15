"use client";

import { useI18n } from "@/i18n/context";

export type TimeframeOption = "1h" | "4h" | "1d";

interface Props {
  active: TimeframeOption;
  onChange: (tf: TimeframeOption) => void;
}

const TABS: { value: TimeframeOption; label: string; reqKey: string }[] = [
  { value: "1h", label: "1H", reqKey: "timeframe.1h" },
  { value: "4h", label: "4H", reqKey: "timeframe.4h" },
  { value: "1d", label: "1D", reqKey: "timeframe.1d" },
];

export function TimeframeTabs({ active, onChange }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1 border border-gray-700/50">
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              isActive
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/40"
            }`}
            title={t(tab.reqKey)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

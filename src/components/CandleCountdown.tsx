"use client";

import { useI18n } from "@/i18n/context";
import { useCountdown } from "@/lib/countdown-context";
import { useTimeframe } from "@/lib/timeframe";

// ─── Candle Countdown Timer ────────────────────────────────────────────────
// TradingView-style countdown to next candle close.
// Shows timeframe badge + live countdown.
// States: normal → urgent (<60s) → critical (<10s).

export function CandleCountdown() {
  const { t } = useI18n();
  const { display, isUrgent, isCritical } = useCountdown();
  const { timeframe } = useTimeframe();

  const tfLabel = t("timeframe.short_" + timeframe);

  return (
    <div className="flex items-center gap-1.5 bg-gray-900 rounded-lg px-2.5 py-1 border border-gray-800 select-none">
      {/* Timeframe badge */}
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        {tfLabel}
      </span>

      <div className="w-px h-3 bg-gray-700/50" />

      {/* Countdown value */}
      <span
        className={`
          text-[11px] font-mono font-semibold tabular-nums tracking-wide
          transition-colors duration-300
          ${isCritical
            ? "text-red-400 animate-pulse"
            : isUrgent
              ? "text-amber-400"
              : "text-gray-300"
          }
        `}
      >
        {display}
      </span>
    </div>
  );
}

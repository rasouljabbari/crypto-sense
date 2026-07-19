"use client";

import { useStore } from "@/store/useStore";
import { useI18n } from "@/i18n/context";
import { useMemo } from "react";
import { SignalType } from "@/lib/types";

const signalRank: Record<SignalType, number> = {
  strong_buy: 5, buy: 4, neutral: 3, sell: 2, strong_sell: 1,
};

const trendStrength: Record<string, number> = {
  strong_bullish: 5, bullish: 4, sideways: 3, bearish: 2, strong_bearish: 1,
};

export function MarketSummary() {
  const { coins } = useStore();
  const { t } = useI18n();

  const summary = useMemo(() => {
    const total = coins.length;
    if (total === 0) return null;

    const signalCount: Record<SignalType, number> = {
      strong_buy: 0, buy: 0, neutral: 0, sell: 0, strong_sell: 0,
    };

    let scoreSum = 0;
    let riskSum = 0;
    let confidenceSum = 0;
    let trendSum = 0;

    for (const c of coins) {
      signalCount[c.signal]++;
      scoreSum += c.overallScore;
      riskSum += c.riskLevel === "low" ? 1 : c.riskLevel === "medium" ? 2 : 3;
      confidenceSum += c.confidence;
      trendSum += trendStrength[c.trendLabel] ?? 3;
    }

    return {
      signalCount,
      avgScore: Math.round(scoreSum / total),
      avgRisk: (riskSum / total).toFixed(1),
      avgConfidence: Math.round(confidenceSum / total),
      avgTrend: (trendSum / total).toFixed(1),
      total,
    };
  }, [coins]);

  if (!summary) return null;

  const signalBars = [
    { key: "strong_buy" as const, color: "bg-emerald-400", text: "text-emerald-300" },
    { key: "buy" as const, color: "bg-emerald-500", text: "text-emerald-400" },
    { key: "neutral" as const, color: "bg-yellow-500", text: "text-yellow-400" },
    { key: "sell" as const, color: "bg-red-500", text: "text-red-400" },
    { key: "strong_sell" as const, color: "bg-red-400", text: "text-red-300" },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-white">{t("market_summary.title")}</h3>
        <span className="text-[10px] text-gray-500">({summary.total} {t("market_summary.coins")})</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {signalBars.map((s) => {
          const count = summary.signalCount[s.key];
          const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
          return (
            <div key={s.key} className="bg-gray-800/40 rounded-lg p-3">
              <div className={`text-[10px] font-semibold ${s.text} mb-1.5`}>
                {t(`coin_row.${s.key}`)}
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-lg font-bold text-white">{count}</span>
                <span className="text-[10px] text-gray-500">({pct.toFixed(0)}%)</span>
              </div>
              <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryMetric
          label={t("market_summary.avg_score")}
          value={summary.avgScore}
          max={100}
          color={summary.avgScore >= 60 ? "text-emerald-400" : summary.avgScore <= 40 ? "text-red-400" : "text-yellow-400"}
        />
        <SummaryMetric
          label={t("market_summary.avg_risk")}
          value={parseFloat(summary.avgRisk)}
          max={3}
          color={summary.avgRisk <= "1.5" ? "text-emerald-400" : summary.avgRisk <= "2.0" ? "text-yellow-400" : "text-red-400"}
          suffix={t("market_summary.out_of_3")}
        />
        <SummaryMetric
          label={t("market_summary.avg_confidence")}
          value={summary.avgConfidence}
          max={100}
          color={summary.avgConfidence >= 60 ? "text-emerald-400" : summary.avgConfidence <= 40 ? "text-red-400" : "text-yellow-400"}
        />
        <SummaryMetric
          label={t("market_summary.avg_trend")}
          value={parseFloat(summary.avgTrend)}
          max={5}
          color={summary.avgTrend >= "3.5" ? "text-emerald-400" : summary.avgTrend <= "2.5" ? "text-red-400" : "text-yellow-400"}
          suffix={t("market_summary.out_of_5")}
        />
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="bg-gray-800/40 rounded-lg p-3">
      <div className="text-[10px] text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>
        {value}{suffix ?? ""}
      </div>
      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-1.5">
        <div
          className={`h-full rounded-full ${value / max >= 0.6 ? "bg-emerald-500" : value / max <= 0.4 ? "bg-red-500" : "bg-yellow-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

"use client";

import { useI18n } from "@/i18n/context";
import type { AnalysisSnapshot } from "@/store/useAnalysisSnapshot";
import Link from "next/link";
import { memo } from "react";
import { CoinImage } from "./CoinImage";

interface Props {
  coin: AnalysisSnapshot;
}

/** Normalize trend to underscore format. */
function ss(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-900/20",
  medium: "text-yellow-400 bg-yellow-900/20",
  high: "text-red-400 bg-red-900/20",
};

const trendIcons: Record<string, string> = {
  strong_bullish: "\u25B2",
  bullish: "\u25B2",
  sideways: "\u25C6",
  bearish: "\u25BC",
  strong_bearish: "\u25BC",
};

const trendColors: Record<string, string> = {
  strong_bullish: "text-emerald-300",
  bullish: "text-emerald-400",
  sideways: "text-yellow-400",
  bearish: "text-red-400",
  strong_bearish: "text-red-300",
};

const recConfig: Record<string, { color: string; bg: string; dot: string }> = {
  ready: { color: "text-emerald-400", bg: "bg-emerald-900/25", dot: "bg-emerald-400" },
  wait: { color: "text-yellow-400", bg: "bg-yellow-900/25", dot: "bg-yellow-400" },
  skip: { color: "text-red-400", bg: "bg-red-900/25", dot: "bg-red-400" },
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export const CoinRow = memo(function CoinRow({ coin }: Props) {
  const { t } = useI18n();

  const change24h = coin.marketState.timeframeChangePercentRaw;
  const isPositive = change24h >= 0;
  const trend = ss(coin.marketState.trend);
  const rc = recConfig[coin.opportunity.recommendation] ?? recConfig.skip;
  const reasons = (coin.opportunity.reasons ?? []).slice(0, 1);
  const timeAgo = formatTimeAgo(coin.generatedAt);

  return (
    <Link
      href={`/analysis?coin=${coin.coin}`}
      className="block hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0"
    >
      <div className="grid grid-cols-[2fr_repeat(5,1fr)] gap-1 items-center px-3 pt-3 text-sm">
        {/* Coin */}
        <div className="flex items-center gap-2 min-w-0">
          <CoinImage src={coin.image} alt={coin.symbol} />
          <div className="truncate">
            <span className="font-medium text-white text-sm">{coin.symbol}</span>
            <span className="text-gray-400 ml-1 text-[11px]">{coin.name}</span>
          </div>
        </div>

        {/* Opportunity */}
        <div className="flex flex-col items-center justify-center min-w-0">
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rc.bg} ${rc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
            {t(`coin_row.rec_${coin.opportunity.recommendation}`)}
          </div>
        </div>

        {/* Confidence */}
        <span className="text-[10px] font-mono text-gray-300 text-center">{coin.opportunity.confidence}%</span>

        {/* Trend */}
        <div className={`flex items-center gap-1 justify-start text-[11px] font-semibold ${trendColors[trend]}`}>
          <span>{trendIcons[trend]}</span>
          <span className="hidden xl:inline">{t(`coin_row.${trend}`)}</span>
        </div>

        {/* Price */}
        <div className="text-right font-mono text-sm text-white truncate">
          ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
        </div>

        {/* Timeframe change % */}
        <div className={`text-right font-mono text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {coin.marketState.timeframeChangePercent}
        </div>
      </div>

      {/* Analysis Summary sub-row */}
      <div className="px-3 pb-3 flex items-center gap-1.5 text-[9px] text-gray-600">
        <span>{t(`coin_row.rec_${coin.opportunity.recommendation}`)}</span>
        <span>·</span>
        <span className="font-mono">{coin.opportunity.confidence}%</span>
        <span>·</span>
        <span className="truncate max-w-[160px]" title={reasons.join(", ")}>
          {reasons.length > 0 ? reasons[0] : t(`coin_row.rec_reason_${coin.opportunity.reasonCode}`)}
        </span>
        <span className="ml-auto">{coin.timeframe}</span>
        <span>·</span>
        <span>{timeAgo}</span>
        <span>·</span>
        <span>v{coin.version}</span>
      </div>
    </Link>
  );
});

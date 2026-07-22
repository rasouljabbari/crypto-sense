"use client";

import { useI18n } from "@/i18n/context";
import { CoinAnalysis } from "@/lib/types";
import Link from "next/link";
import { memo, useState } from "react";
import { CoinImage } from "./CoinImage";

interface Props {
  coin: CoinAnalysis;
}

const signalColors: Record<string, string> = {
  strong_buy: "text-emerald-300",
  buy: "text-emerald-400",
  neutral: "text-yellow-400",
  sell: "text-red-400",
  strong_sell: "text-red-300",
};

const signalBg: Record<string, string> = {
  strong_buy: "bg-emerald-900/30",
  buy: "bg-emerald-900/20",
  neutral: "bg-yellow-900/20",
  sell: "bg-red-900/20",
  strong_sell: "bg-red-900/30",
};

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

export const CoinRow = memo(function CoinRow({ coin }: Props) {
  const { t } = useI18n();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const isPositive = coin.marketData.priceChangePercent24h >= 0;

  const rc = recConfig[coin.recommendation] ?? recConfig.skip;

  return (
    <Link
      href={`/coin/${coin.marketData.symbol}`}
      className="grid grid-cols-[2fr_repeat(7,1fr)] gap-1 items-center px-3 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0 text-sm"
    >
      {/* Coin */}
      <div className="flex items-center gap-2 min-w-0">
        <CoinImage src={coin.marketData.image} alt={coin.marketData.symbol} />
        <div className="truncate">
          <span className="font-medium text-white text-sm">{coin.marketData.symbol}</span>
          <span className="text-gray-400 ml-1 text-[11px] hidden sm:inline">{coin.marketData.name}</span>
        </div>
      </div>

      {/* Opportunity */}
      <div
        className="relative flex flex-col items-center justify-center min-w-0"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTooltipOpen((v) => !v); }}
      >
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rc.bg} ${rc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
          {t(`coin_row.rec_${coin.recommendation}`)}
        </div>
        <span className="text-[8px] text-gray-500 leading-tight mt-0.5">{t(`coin_row.rec_reason_${coin.recommendationReasonCode}`)}</span>

        {tooltipOpen && (
          <div className="absolute top-full mt-1 z-50 w-56 p-2 rounded-lg bg-gray-800 border border-gray-700 shadow-xl text-[10px] text-gray-200 pointer-events-none">
            <div className="font-semibold text-white mb-1">
              {t(`coin_row.rec_${coin.recommendation}`)}
            </div>
            <p>{t(`coin_row.rec_tooltip_${coin.recommendationReasonCode}`)}</p>
          </div>
        )}
      </div>

      {/* Signal */}
      <span className={`text-[10px] font-bold text-center px-1 py-0.5 rounded ${signalBg[coin.signal]} ${signalColors[coin.signal]}`}>
        {t(`coin_row.${coin.signal}`)}
      </span>

      {/* Confidence */}
      <span className="text-[10px] font-mono text-gray-300 text-center">{coin.confidence}%</span>

      {/* Trade Quality */}
      <span className="text-[10px] font-mono text-gray-300 text-center">{coin.tradeQuality}</span>

      {/* Trend */}
      <div className={`flex items-center gap-1 justify-start text-[11px] font-semibold ${trendColors[coin.trendLabel]}`}>
        <span>{trendIcons[coin.trendLabel]}</span>
        <span className="hidden xl:inline">{t(`coin_row.${coin.trendLabel}`)}</span>
      </div>

      {/* Price */}
      <div className="text-right font-mono text-sm text-white truncate">
        ${coin.marketData.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
      </div>

      {/* 24h % */}
      <div className={`text-right font-mono text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "+" : ""}{coin.marketData.priceChangePercent24h.toFixed(2)}%
      </div>
    </Link>
  );
});

"use client";

import type { MarketCardData } from "../types";

interface MarketCardProps {
  readonly data: MarketCardData;
  readonly titleLabel: string;
  readonly priceLabel: string;
  readonly trendLabel: string;
  readonly volumeLabel: string;
  readonly highLabel: string;
  readonly lowLabel: string;
}

const TREND_COLORS: Record<string, string> = {
  bullish: "text-emerald-400",
  bearish: "text-red-400",
  neutral: "text-yellow-400",
};

const VOLATILITY_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-red-400",
  extreme: "text-red-400",
};

export function MarketCard({
  data,
  titleLabel,
  priceLabel,
  trendLabel,
  volumeLabel,
  highLabel,
  lowLabel,
}: MarketCardProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-100">{titleLabel}</h3>
      </div>

      <div className="space-y-3">
        {/* Price */}
        <div className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
          <span className="text-xs text-gray-500">{priceLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-white">{data.price}</span>
            <span className={`text-xs font-medium tabular-nums ${data.isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {data.changePercent24h}
            </span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
          <span className="text-xs text-gray-500">{trendLabel}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${data.trendStatus === "bullish" ? "bg-emerald-400" : data.trendStatus === "bearish" ? "bg-red-400" : "bg-yellow-400"}`} />
            <span className={`text-xs font-medium ${TREND_COLORS[data.trendStatus] ?? "text-gray-400"}`}>
              {data.trend}
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
          <span className="text-xs text-gray-500">{volumeLabel}</span>
          <span className="text-sm font-medium tabular-nums text-gray-200">{data.volume}</span>
        </div>

        {/* 24h Range */}
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-gray-500">{highLabel} / {lowLabel}</span>
          <span className="text-xs font-medium tabular-nums text-gray-300">
            {data.high24h} / {data.low24h}
          </span>
        </div>
      </div>
    </div>
  );
}

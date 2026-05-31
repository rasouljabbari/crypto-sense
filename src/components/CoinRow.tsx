"use client";

import { CoinAnalysis, PositionType } from "@/lib/types";
import { getPositionLabel } from "@/lib/scoring";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/context";

function trendIcon(trend: "bullish" | "bearish" | "neutral") {
  switch (trend) {
    case "bullish": return "▲";
    case "bearish": return "▼";
    case "neutral": return "◆";
  }
}

function rsiLevel(coin: CoinAnalysis): { value: string; color: string } {
  const rsi = coin.technicalIndicators.rsi;
  const v = rsi.toFixed(0);
  if (rsi > 70) return { value: v, color: "text-red-400" };
  if (rsi > 60) return { value: v, color: "text-orange-400" };
  if (rsi < 30) return { value: v, color: "text-emerald-400" };
  if (rsi < 40) return { value: v, color: "text-cyan-400" };
  return { value: v, color: "text-gray-300" };
}

interface RiskAllocation {
  value: number;
  label: string;
  color: string;
}

function calcRiskAllocation(coin: CoinAnalysis): RiskAllocation {
  let score = 0;

  const trendMatch =
    (coin.position === "long" && coin.trendAnalysis.shortTerm === "bullish") ||
    (coin.position === "short" && coin.trendAnalysis.shortTerm === "bearish");
  if (trendMatch) score += 30;
  else if (coin.trendAnalysis.shortTerm === "neutral") score += 15;

  score += (coin.overallScore / 100) * 25;

  const rsi = coin.technicalIndicators.rsi;
  if (coin.position === "long") {
    if (rsi < 30) score += 25;
    else if (rsi < 50) score += 20;
    else if (rsi < 70) score += 10;
    else score += 0;
  } else if (coin.position === "short") {
    if (rsi > 70) score += 25;
    else if (rsi > 50) score += 20;
    else if (rsi > 30) score += 10;
    else score += 0;
  } else {
    score += 10;
  }

  if (score >= 85) return { value: 1.0, label: "1.00", color: "text-emerald-400 bg-emerald-900/20" };
  if (score >= 65) return { value: 0.75, label: "0.75", color: "text-emerald-400 bg-emerald-900/20" };
  if (score >= 40) return { value: 0.50, label: "0.50", color: "text-yellow-400 bg-yellow-900/20" };
  return { value: 0.25, label: "0.25", color: "text-red-400 bg-red-900/20" };
}

interface ActionInfo { label: string; color: string }
function calcActionLabel(coin: CoinAnalysis, t: (path: string, vars?: Record<string, string | number>) => string): ActionInfo {
  const pl = getPositionLabel(coin.overallScore, coin.position);
  return { label: t(pl.labelKey), color: pl.text };
}

const positionConfig: Record<PositionType, { labelKey: string; bg: string; text: string }> = {
  long: { labelKey: "coin_row.long", bg: "bg-emerald-900/30", text: "text-emerald-400" },
  short: { labelKey: "coin_row.short", bg: "bg-red-900/30", text: "text-red-400" },
  neutral: { labelKey: "coin_row.neutral", bg: "bg-yellow-900/30", text: "text-yellow-400" },
};

interface Props {
  coin: CoinAnalysis;
}

export function CoinRow({ coin }: Props) {
  const { t } = useI18n();
  const [imgErr, setImgErr] = useState(false);

  const pos = positionConfig[coin.position];
  const posLabel = t(pos.labelKey);
  const isPositive = coin.marketData.priceChangePercent24h >= 0;
  const rsi = rsiLevel(coin);
  const risk = calcRiskAllocation(coin);
  const action = calcActionLabel(coin, t);

  return (
    <Link
      href={`/coin/${coin.marketData.symbol}`}
      className="min-w-[640px] grid grid-cols-[2fr_1.2fr_0.5fr_1fr_1fr_1fr] gap-2 items-center px-4 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 last:border-0 text-sm"
    >
      {/* Name with Rank */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-500 w-5 text-right font-mono" title={t("table.columns.rank_tooltip")}>#{coin.marketData.rank}</span>
        {imgErr ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
            {coin.marketData.symbol[0]}
          </div>
        ) : (
          <img
            src={coin.marketData.image}
            alt={coin.marketData.symbol}
            className="w-6 h-6 rounded-full"
            onError={() => setImgErr(true)}
          />
        )}
        <div>
          <span className="font-medium text-white">{coin.marketData.symbol}</span>
          <span className="text-gray-400 ml-1.5 text-xs">{coin.marketData.name}</span>
        </div>
      </div>

      {/* Merged Signal: Trend + Position + Score + Action */}
      <div className="flex items-center gap-1.5 justify-start">
        <span className={`text-[10px] ${coin.trendAnalysis.shortTerm === "bullish" ? "text-emerald-400" : coin.trendAnalysis.shortTerm === "bearish" ? "text-red-400" : "text-yellow-400"}`}>
          {trendIcon(coin.trendAnalysis.shortTerm)}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.bg} ${pos.text}`}>
          {posLabel}
        </span>
        <div className="w-10 h-1 bg-gray-700 rounded-full overflow-hidden hidden sm:block">
          <div
            className={`h-full rounded-full ${coin.overallScore >= 60 ? "bg-emerald-500" : coin.overallScore <= 40 ? "bg-red-500" : "bg-yellow-500"}`}
            style={{ width: `${coin.overallScore}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-white w-5 text-right">{coin.overallScore}</span>
        <span className={`text-[9px] font-semibold hidden lg:inline ${action.color}`}>
          {action.label}
        </span>
      </div>

      {/* Risk Allocation */}
      <div className="text-center">
        <span className={`inline-flex items-center justify-center w-12 px-1.5 py-0.5 rounded text-[10px] font-bold ${risk.color}`}>
          {risk.label}
        </span>
      </div>

      {/* Price */}
      <div className="text-right font-mono text-sm text-white">
        ${coin.marketData.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* 24h % */}
      <div className="text-right font-mono text-sm">
        <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
          {isPositive ? "+" : ""}{coin.marketData.priceChangePercent24h.toFixed(2)}%
        </span>
      </div>

      {/* RSI */}
      <div className={`text-right font-mono text-xs ${rsi.color}`} title={t("coin_row.rsi_tooltip")}>
        {rsi.value}
      </div>
    </Link>
  );
}

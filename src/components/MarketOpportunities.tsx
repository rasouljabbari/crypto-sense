"use client";

import { useStore } from "@/store/useStore";
import { useI18n } from "@/i18n/context";
import { useMemo } from "react";
import { CoinImage } from "./CoinImage";
import Link from "next/link";

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

function scoreBadge(score: number) {
  if (score >= 60) return "text-emerald-400 bg-emerald-900/20";
  if (score <= 40) return "text-red-400 bg-red-900/20";
  return "text-yellow-400 bg-yellow-900/20";
}

interface OppCard {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  overallScore: number;
  signal: string;
  confidence: number;
  tradeQuality: number;
}

function Card({
  title,
  icon,
  accent,
  opp,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  accent: "emerald" | "red" | "cyan" | "teal";
  opp: OppCard | null;
  href: string;
}) {
  const { t } = useI18n();
  const borderColor =
    accent === "emerald"
      ? "border-emerald-500/20"
      : accent === "red"
        ? "border-red-500/20"
        : accent === "cyan"
          ? "border-cyan-500/20"
          : "border-teal-500/20";
  const glow =
    accent === "emerald"
      ? "bg-emerald-500/5"
      : accent === "red"
        ? "bg-red-500/5"
        : accent === "cyan"
          ? "bg-cyan-500/5"
          : "bg-teal-500/5";
  const iconColor =
    accent === "emerald"
      ? "text-emerald-400 bg-emerald-900/30"
      : accent === "red"
        ? "text-red-400 bg-red-900/30"
        : accent === "cyan"
          ? "text-cyan-400 bg-cyan-900/30"
          : "text-teal-400 bg-teal-900/30";

  if (!opp) {
    return (
      <div className={`bg-gray-900/50 border ${borderColor} rounded-xl p-4 ${glow}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>{icon}</div>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <p className="text-xs text-gray-500 py-6 text-center">{t("market_opps.no_data")}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`block bg-gray-900/50 border ${borderColor} rounded-xl p-4 ${glow} hover:bg-gray-800/60 transition-all hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>{icon}</div>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <CoinImage src={opp.image} alt={opp.symbol} />
        <div className="min-w-0">
          <span className="text-sm font-medium text-white">{opp.symbol}</span>
          <span className="text-[11px] text-gray-400 ml-1.5 hidden sm:inline">{opp.name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreBadge(opp.overallScore)}`}>
          {opp.overallScore}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${signalBg[opp.signal]} ${signalColors[opp.signal]}`}>
          {t(`coin_row.${opp.signal}`)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-gray-400">
          {t("market_opps.confidence")} <span className="font-mono text-gray-200">{opp.confidence}%</span>
        </span>
        <span className="text-gray-400">
          {t("market_opps.quality")} <span className="font-mono text-gray-200">{opp.tradeQuality}</span>
        </span>
      </div>
    </Link>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7 7 7-7" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function MarketOpportunities() {
  const { t } = useI18n();
  const { coins } = useStore();

  const opps = useMemo(() => {
    const withData = coins.filter((c) => c.marketData.currentPrice > 0);
    if (withData.length === 0) {
      return { topBuy: null, topSell: null, topMomentum: null, lowestRisk: null };
    }

    const toOpp = (c: typeof withData[number]): OppCard => ({
      coinId: c.coinId,
      symbol: c.marketData.symbol,
      name: c.marketData.name,
      image: c.marketData.image,
      overallScore: c.overallScore,
      signal: c.signal,
      confidence: c.confidence,
      tradeQuality: c.tradeQuality,
    });

    const longest = [...withData].filter((c) => c.signal === "strong_buy" || c.signal === "buy");
    const topBuy = longest.length > 0
      ? toOpp(longest.reduce((a, b) => (a.overallScore >= b.overallScore ? a : b)))
      : null;

    const shortest = [...withData].filter((c) => c.signal === "strong_sell" || c.signal === "sell");
    const topSell = shortest.length > 0
      ? toOpp(shortest.reduce((a, b) => (a.overallScore <= b.overallScore ? a : b)))
      : null;

    const sortedMomentum = [...withData].sort((a, b) => b.tradeQuality - a.tradeQuality);
    const topMomentum = toOpp(sortedMomentum[0]);

    const lowRiskSorted = [...withData]
      .filter((c) => c.riskLevel === "low")
      .sort((a, b) => b.tradeQuality - a.tradeQuality);
    const lowestRisk = lowRiskSorted.length > 0 ? toOpp(lowRiskSorted[0]) : toOpp(sortedMomentum[0]);

    return { topBuy, topSell, topMomentum, lowestRisk };
  }, [coins]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <Card
        title={t("market_opps.top_buy")}
        icon={<ArrowUpIcon />}
        accent="emerald"
        opp={opps.topBuy}
        href={`/coin/${opps.topBuy?.coinId ?? ""}`}
      />
      <Card
        title={t("market_opps.top_sell")}
        icon={<ArrowDownIcon />}
        accent="red"
        opp={opps.topSell}
        href={`/coin/${opps.topSell?.coinId ?? ""}`}
      />
      <Card
        title={t("market_opps.highest_momentum")}
        icon={<LightningIcon />}
        accent="cyan"
        opp={opps.topMomentum}
        href={`/coin/${opps.topMomentum?.coinId ?? ""}`}
      />
      <Card
        title={t("market_opps.lowest_risk")}
        icon={<ShieldIcon />}
        accent="teal"
        opp={opps.lowestRisk}
        href={`/coin/${opps.lowestRisk?.coinId ?? ""}`}
      />
    </div>
  );
}

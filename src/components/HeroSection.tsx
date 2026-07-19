"use client";

import { ScoreRing } from "@/components/ScoreRing";
import { CoinImage } from "@/components/CoinImage";
import { useI18n } from "@/i18n/context";
import type { CoinAnalysis, Recommendation, RiskLevel } from "@/lib/types";

interface HeroSectionProps {
  readonly coin: CoinAnalysis;
  readonly timeframe: string;
}

// ─── Opportunity ────────────────────────────────────────────────────────────

const opportunityStyles: Record<
  Recommendation,
  { emoji: string; bg: string; border: string; accent: string }
> = {
  ready: {
    emoji: "🟢",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
  },
  wait: {
    emoji: "🟡",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    accent: "text-yellow-400",
  },
  skip: {
    emoji: "🔴",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    accent: "text-red-400",
  },
};

// ─── Risk Ring ──────────────────────────────────────────────────────────────

const riskStyles: Record<
  RiskLevel,
  { text: string; bg: string; border: string; arc: number; color: string }
> = {
  low:    { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", arc: 70,  color: "#34d399" },
  medium: { text: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  arc: 140, color: "#facc15" },
  high:   { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     arc: 210, color: "#f87171" },
};

const RISK_CIRCUMFERENCE = 2 * Math.PI * 37; // ~232.48

// ─── Component ──────────────────────────────────────────────────────────────

export function HeroSection({ coin, timeframe }: HeroSectionProps) {
  const { t } = useI18n();
  const md = coin.marketData;
  const isPositive = md.priceChangePercent24h >= 0;
  const opp = opportunityStyles[coin.recommendation];
  const risk = riskStyles[coin.riskLevel];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-6">
      {/* ── Row 1: Coin Identity + Price ─────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <CoinImage
          src={md.image}
          alt={md.symbol}
          className="w-10 h-10 sm:w-14 sm:h-14 rounded-full shrink-0"
          size={56}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">
              {md.name}
            </h1>
            <span className="text-gray-400 text-sm font-medium shrink-0">
              {md.symbol}
            </span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-white tabular-nums">
              $
              {md.currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {md.priceChangePercent24h.toFixed(2)}%
            </span>
            <span className="text-xs text-gray-500">{t("fear_greed.h24_label")}</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Opportunity — The Decision ────────────────────────── */}
      <div className="flex flex-col items-center justify-center mt-5 pt-5 border-t border-gray-800/50">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-2.5">
          {t("coin_detail.hero.opportunity")}
        </p>
        <div
          className={`inline-flex items-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border-2 ${opp.bg} ${opp.border} shadow-lg`}
        >
          <span className="text-2xl sm:text-3xl">{opp.emoji}</span>
          <span className={`text-lg sm:text-xl font-bold ${opp.accent}`}>
            {t(`coin_row.rec_${coin.recommendation}`)}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-2.5">
          {t("coin_detail.hero.opportunity_question")}
        </p>
      </div>

      {/* ── Row 3: Score Rings ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-5 pt-5 border-t border-gray-800/50">
        <div className="flex flex-col items-center">
          <ScoreRing
            value={coin.overallScore}
            size={88}
            strokeWidth={6}
            label={t("coin_detail.hero.score")}
          />
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing
            value={coin.confidence}
            size={88}
            strokeWidth={6}
            label={t("coin_detail.hero.confidence")}
          />
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing
            value={coin.tradeQuality}
            size={88}
            strokeWidth={6}
            label={t("coin_detail.hero.quality")}
          />
        </div>

        {/* Risk Indicator */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative" style={{ width: 88, height: 88 }}>
            <svg width={88} height={88} className="-rotate-90 absolute">
              <circle
                cx={44}
                cy={44}
                r={37}
                fill="none"
                stroke="#1f2937"
                strokeWidth={6}
              />
              <circle
                cx={44}
                cy={44}
                r={37}
                fill="none"
                stroke={risk.color}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${risk.arc} ${RISK_CIRCUMFERENCE}`}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold leading-none ${risk.text}`}>
                {coin.riskLevel === "low"
                  ? "L"
                  : coin.riskLevel === "medium"
                    ? "M"
                    : "H"}
              </span>
              <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                {t("coin_detail.hero.risk")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Meta ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-800/50 text-xs text-gray-500 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          {t("coin_detail.hero.analysis_period", {
            timeframe: t("timeframe." + timeframe),
          })}
        </span>
        <span className="text-gray-700">·</span>
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t("coin_detail.hero.last_updated", {
            time: new Date(coin.lastUpdated).toLocaleTimeString(),
          })}
        </span>
      </div>
    </div>
  );
}

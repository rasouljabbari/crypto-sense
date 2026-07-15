"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useI18n } from "@/i18n/context";
import { useCoinAnalysis } from "@/features/coin-analysis/hooks/useCoinAnalysis";
import type { CoinAnalysisState } from "@/features/coin-analysis/types";
import { Card } from "@/components/Card";

const CandlestickChart = dynamic(
  () => import("@/components/CandlestickChart").then((m) => m.CandlestickChart),
  { ssr: false },
);

interface CoinAnalysisResultProps {
  readonly coinId: string;
}

export function CoinAnalysisResult({ coinId }: CoinAnalysisResultProps) {
  const { t } = useI18n();
  const [tf, setTf] = useState("1h");
  const analysis = useCoinAnalysis(coinId, tf);

  if (analysis.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-[300px] bg-gray-900/30 border border-gray-800/50 rounded-xl animate-pulse" />
        <Card loading />
      </div>
    );
  }

  if (analysis.status === "error") {
    const errMsg = String(analysis.error ?? "");
    const translated = errMsg.includes("Cannot resolve symbol")
      ? t("errors.cannot_resolve_symbol", { symbol: coinId })
      : errMsg;
    return <Card error={translated} title={t("coin_analysis.error_title")} />;
  }

  if (analysis.status === "noResult") {
    return (
      <Card title={t("coin_analysis.no_result_title")}>
        <p className="text-sm text-gray-400">
          {t("coin_analysis.no_result_description", { coin: coinId })}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SignalCard explanation={analysis.explanation} overallScore={analysis.overallScore} />
        <MarketCard data={analysis.market} />
        <ScoreOverview analysis={analysis} />
      </div>
      <ChartSection coinId={coinId} onTimeframeChange={setTf} />
    </div>
  );
}

function ChartSection({ coinId, onTimeframeChange }: { readonly coinId: string; readonly onTimeframeChange?: (interval: string) => void }) {
  return (
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl overflow-hidden" style={{ height: 480 }}>
      <CandlestickChart coinId={coinId} onTimeframeChange={onTimeframeChange} />
    </div>
  );
}

function SignalCard({
  explanation,
  overallScore,
}: {
  readonly explanation: CoinAnalysisState["explanation"];
  readonly overallScore: CoinAnalysisState["overallScore"];
}) {
  const { t } = useI18n();
  const s = overallScore.signal;
  const isAction = s === "Strong Buy" || s === "Buy";
  const isWait = s === "Strong Sell" || s === "Sell";

  const badgeColor = isAction
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isWait
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

  const actionLabel = isAction
    ? t("coin_analysis.recommendation.open")
    : isWait
      ? t("coin_analysis.recommendation.wait")
      : t("coin_analysis.recommendation.neutral");

  return (
    <Card
      title={t("coin_analysis.recommendation.title")}
      subtitle={`${overallScore.value.toFixed(0)} — ${t("coin_row." + overallScore.signal.toLowerCase().replace(" ", "_"))}`}
    >
      <div className="space-y-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${badgeColor}`}>
          {actionLabel}
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          {explanation.summary}
        </p>

        {explanation.strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.strengths")}
            </p>
            <ul className="space-y-0.5">
              {explanation.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {explanation.weaknesses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.weaknesses")}
            </p>
            <ul className="space-y-0.5">
              {explanation.weaknesses.map((w, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">−</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {explanation.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.risks")}
            </p>
            <ul className="space-y-0.5">
              {explanation.risks.map((r, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-yellow-400 mt-0.5 shrink-0">!</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function MarketCard({ data }: { readonly data: CoinAnalysisState["market"] }) {
  const { t } = useI18n();

  return (
    <Card title={t("coin_analysis.market.title")}>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("coin_analysis.market.price")} value={data.price} />
        <Stat label={t("coin_analysis.market.change_24h")} value={data.change24h} className={data.isPositive ? "text-emerald-400" : "text-red-400"} />
        <Stat label={t("coin_analysis.market.change_percent")} value={data.changePercent24h} className={data.isPositive ? "text-emerald-400" : "text-red-400"} />
        <Stat label={t("coin_analysis.market.high")} value={data.high24h} />
        <Stat label={t("coin_analysis.market.low")} value={data.low24h} />
        <Stat label={t("coin_analysis.market.volume")} value={data.volume} />
        {data.nearestSupport && <Stat label={t("coin_analysis.market.support")} value={data.nearestSupport} className="text-emerald-400" />}
        {data.nearestResistance && <Stat label={t("coin_analysis.market.resistance")} value={data.nearestResistance} className="text-red-400" />}
      </div>
    </Card>
  );
}

function ScoreOverview({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();
  const { scores, overallScore } = analysis;

  return (
    <Card title={t("coin_analysis.score.title")} subtitle={`${overallScore.value.toFixed(0)} — ${t("coin_row." + overallScore.signal.toLowerCase().replace(" ", "_"))}`}>
      <div className="space-y-2">
        {Object.entries(scores).map(([key, score]) => key !== "momentum" && (
          <div key={key}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-300">{t(`coin_analysis.score.${key}`)}</span>
              <span className="text-gray-400">{score.value}</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${score.value >= 65 ? "bg-blue-500" : score.value <= 40 ? "bg-red-500" : "bg-yellow-500"}`}
                style={{ width: `${score.value}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{score.title}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value, className = "" }: { readonly label: string; readonly value: string; readonly className?: string }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs font-bold tabular-nums ${className}`}>{value}</p>
    </div>
  );
}

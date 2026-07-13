"use client";

import { useI18n } from "@/i18n/context";
import { useCoinAnalysis } from "../hooks/useCoinAnalysis";
import { ScoreCard } from "./ScoreCard";
import { TradeSetupCard } from "./TradeSetupCard";
import { MarketCard } from "./MarketCard";
import { IndicatorsCard } from "./IndicatorsCard";
import { ExplanationCard } from "./ExplanationCard";
import { CoinAnalysisLoading } from "./CoinAnalysisLoading";

interface CoinAnalysisResultProps {
  readonly coinId: string;
}

export function CoinAnalysisResult({ coinId }: CoinAnalysisResultProps) {
  const { t } = useI18n();
  const state = useCoinAnalysis(coinId);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (state.status === "loading") {
    return <CoinAnalysisLoading />;
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="mb-4 text-red-400">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-300 mb-1">
          {t("coin_analysis.error_title")}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">{state.error?.message}</p>
      </div>
    );
  }

  /* ── No result (coin not found / invalid) ────────────────────────────── */
  if (state.status === "noResult") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="mb-4 text-yellow-400/60">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-300 mb-1">
          {t("coin_analysis.no_result_title")}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {t("coin_analysis.no_result_description", { coin: coinId.toUpperCase() })}
        </p>
      </div>
    );
  }

  /* ── Result ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Row 1: Score + Trade Setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ScoreCard
          overall={state.overall}
          signal={state.signal}
          confidence={state.confidence}
          overallLabel={t("coin_analysis.score.overall")}
          signalLabel={t("coin_analysis.score.signal")}
          confidenceLabel={t("coin_analysis.score.confidence")}
        />
        <TradeSetupCard
          hasTrade={state.hasTrade}
          reason={state.tradeReason}
          entry={state.entry}
          entryDirection={state.entryDirection}
          entryDirectionLabel={state.entryDirectionLabel}
          stopLoss={state.stopLoss}
          tp1={state.takeProfit.tp1}
          tp2={state.takeProfit.tp2}
          tp3={state.takeProfit.tp3}
          entryLabel={t("coin_analysis.trade.entry")}
          stopLossLabel={t("coin_analysis.trade.stop_loss")}
          tp1Label={t("coin_analysis.trade.tp1")}
          tp2Label={t("coin_analysis.trade.tp2")}
          tp3Label={t("coin_analysis.trade.tp3")}
          directionLabel={t("coin_analysis.trade.direction")}
        />
      </div>

      {/* Row 2: Market + Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MarketCard
          data={state.market}
          titleLabel={t("coin_analysis.market.title")}
          priceLabel={t("coin_analysis.market.price")}
          trendLabel={t("coin_analysis.market.trend")}
          volumeLabel={t("coin_analysis.market.volume")}
          highLabel={t("coin_analysis.market.high")}
          lowLabel={t("coin_analysis.market.low")}
        />
        <IndicatorsCard
          items={state.indicators}
          titleLabel={t("coin_analysis.indicators.title")}
        />
      </div>

      {/* Row 3: Explanation (full width) */}
      <ExplanationCard
        data={state.explanation}
        titleLabel={t("coin_analysis.explanation.title")}
        strengthsLabel={t("coin_analysis.explanation.strengths")}
        weaknessesLabel={t("coin_analysis.explanation.weaknesses")}
        risksLabel={t("coin_analysis.explanation.risks")}
        opportunitiesLabel={t("coin_analysis.explanation.opportunities")}
        recommendationLabel={t("coin_analysis.explanation.recommendation")}
      />
    </div>
  );
}

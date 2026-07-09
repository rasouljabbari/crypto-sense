"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { Header } from "@/components/Header";
import { DashboardGrid, DashboardSkeleton, useDashboard } from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const coinId = searchParams.get("coin") || "";
  const [input, setInput] = useState(coinId);

  const { viewModel, isLoading, error } = useDashboard(coinId || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim().toLowerCase();
    if (trimmed) {
      router.push(`/dashboard?coin=${encodeURIComponent(trimmed)}`);
    }
  };

  const labels = {
    cryptoScore: t("dashboard.cards.crypto_score"),
    signal: t("dashboard.cards.signal"),
    confidence: t("dashboard.cards.confidence"),
    risk: t("dashboard.cards.risk"),
    trend: t("dashboard.cards.trend"),
    entry: t("dashboard.cards.entry"),
    takeProfit: t("dashboard.cards.take_profit"),
    stopLoss: t("dashboard.cards.stop_loss"),
    indicators: t("dashboard.cards.indicators"),
    overallScore: t("dashboard.score.overall"),
    riskScore: t("dashboard.risk.score"),
    safer: t("dashboard.risk.safer"),
    riskier: t("dashboard.risk.riskier"),
    trendScore: t("dashboard.score.trend"),
    direction: t("dashboard.trend.direction"),
    riskReward: t("dashboard.trade.risk_reward"),
    riskAmount: t("dashboard.trade.risk_amount"),
    riskPercent: t("dashboard.trade.risk_percent"),
    invalidTrade: t("dashboard.trade.invalid"),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold">{t("dashboard.title")}</h1>
            <p className="text-xs text-gray-500 mt-1">{t("dashboard.subtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("dashboard.search.placeholder")}
              className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors w-40 sm:w-48"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 transition-colors"
            >
              {t("dashboard.search.analyze")}
            </button>
          </form>
        </div>

        {!coinId && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-gray-500 mb-2">{t("dashboard.enter_coin")}</p>
            <p className="text-xs text-gray-600">{t("dashboard.search.examples")}</p>
          </div>
        )}

        {coinId && !viewModel && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-red-400">{error?.message || t("dashboard.no_data")}</p>
          </div>
        )}

        {viewModel && <DashboardGrid viewModel={viewModel} labels={labels} />}

        {coinId && isLoading && <DashboardSkeleton />}
      </main>
    </div>
  );
}

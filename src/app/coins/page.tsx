"use client";

import { CoinTable } from "@/components/CoinTable";
import { MarketOpportunities } from "@/components/MarketOpportunities";
import { MarketSummary } from "@/components/MarketSummary";
import { RefreshStatus } from "@/components/RefreshStatus";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import { useEffect } from "react";

export default function CoinsPage() {
  const { loadFromBinance, isLive } = useStore();
  const { t } = useI18n();
  useBinanceWebSocket();

  useEffect(() => {
    loadFromBinance();
  }, [loadFromBinance]);

  return (
    <DashboardLayout>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{t("coins_page.title")}</h2>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("header.live")}
              </span>
            )}
          </div>
        </div>

        <MarketOpportunities />

        <MarketSummary />

        <RefreshStatus />

        <CoinTable />
    </DashboardLayout>
  );
}



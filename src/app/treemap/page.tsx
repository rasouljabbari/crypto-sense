"use client";

import { Header } from "@/components/Header";
import dynamic from "next/dynamic";

const TreemapChart = dynamic(() => import("@/components/TreemapChart").then(m => m.TreemapChart), { ssr: false });
import { useI18n } from "@/i18n/context";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import Link from "next/link";
import { useEffect } from "react";

export default function TreemapPage() {
  const { loadFromBinance, coins, isLive, isLoading } = useStore();
  const { t, dir } = useI18n();
  useBinanceWebSocket();

  useEffect(() => {
    loadFromBinance();
  }, [loadFromBinance]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("indicators.back")}
        </Link>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{t("treemap.title")}</h2>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t("treemap.live")}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{t("treemap.subtitle")}</p>
          </div>
        </div>

        {isLoading || coins.length === 0 ? (
          <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-16 text-center text-sm text-gray-500">
            {t("indicators.screener.loading")}
          </div>
        ) : (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
            <TreemapChart coins={coins} />
          </div>
        )}
      </main>
    </div>
  );
}

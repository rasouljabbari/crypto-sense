"use client";

import { useI18n } from "@/i18n/context";
import { useBinanceMarket } from "@/hooks/useBinanceMarket";
import { Sparkline } from "@/components/landing/Sparkline";
import { FEATURED_SYMBOLS } from "@/config/featured-coins";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export function MarketTicker() {
  const { t } = useI18n();
  const { getTicker, getSparkline, connected } = useBinanceMarket();

  const changeColor = (dir: "up" | "down") =>
    dir === "up" ? "text-emerald-400" : "text-red-400";

  const changeBg = (dir: "up" | "down") =>
    dir === "up" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {FEATURED_SYMBOLS.map((sym, i) => {
        const ticker = getTicker(sym);
        const sparkline = getSparkline(sym);
        const base = sym.replace("USDT", "");
        const dir = ticker?.dir ?? "up";

        return (
          <motion.div
            key={sym}
            variants={fadeUp}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 transition-all duration-300 hover:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-300">{base}</span>
                </div>
                <span className="text-sm font-semibold text-white">{base}</span>
              </div>
              {sparkline && sparkline.length >= 2 && (
                <Sparkline data={sparkline} width={64} height={20} />
              )}
            </div>

            <div className="text-lg font-bold font-mono text-white">
              {ticker ? `$${ticker.priceFormatted}` : "---"}
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[11px] font-semibold font-mono ${ticker ? changeColor(dir) : "text-gray-600"}`}>
                {ticker ? ticker.changeFormatted : "---"}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {ticker ? ticker.volumeFormatted : "---"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${ticker ? changeBg(dir) : "bg-gray-500/10"}`}>
                <svg className={`w-2.5 h-2.5 ${ticker ? changeColor(dir) : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  {dir === "up" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l9.2-9.2M17 17V7H7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-9.2 9.2M7 7v10h10" />
                  )}
                </svg>
                {ticker ? (dir === "up" ? "BULL" : "BEAR") : "---"}
              </span>
              {!ticker && (
                <span className="text-[9px] text-gray-600">{t("landing.ticker.loading")}</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

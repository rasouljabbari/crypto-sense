"use client";

import { CandlestickChart } from "@/components/CandlestickChart";
import { Header } from "@/components/Header";
import { PositionType, CoinAnalysis } from "@/lib/types";
import { getPositionLabel } from "@/lib/scoring";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import { estimatePosition, calcRSI } from "@/lib/indicators";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";

const BINANCE_REST = "https://api.binance.com/api/v3";

interface FallbackData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  rsi: number;
}

async function fetchFallback(symbol: string): Promise<FallbackData | null> {
  try {
    const [tickerRes, klinesRes] = await Promise.all([
      fetch(`${BINANCE_REST}/ticker/24hr?symbol=${symbol}USDT`),
      fetch(`${BINANCE_REST}/klines?symbol=${symbol}USDT&interval=1h&limit=15`),
    ]);
    if (!tickerRes.ok) return null;
    const t = await tickerRes.json();
    const price = parseFloat(t.lastPrice);
    const changePercent = parseFloat(t.priceChangePercent);

    let rsi = 50;
    if (klinesRes.ok) {
      const klines: string[][] = await klinesRes.json();
      rsi = calcRSI(klines.map((k) => parseFloat(k[4])));
    }

    return {
      symbol,
      name: symbol,
      price,
      changePercent,
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      volume: parseFloat(t.quoteVolume),
      rsi,
    };
  } catch {
    return null;
  }
}

export default function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { loadFromBinance } = useStore();
  const { t, dir } = useI18n();
  useBinanceWebSocket();
  const { id } = use(params);
  const [fallback, setFallback] = useState<FallbackData | undefined>(undefined);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => { loadFromBinance(); }, [loadFromBinance]);

  // Try coinId first, then symbol match, then API fallback
  const storeCoin = useStore((s) => s.coins.find((c) => c.coinId === id))
    ?? useStore((s) => s.coins.find((c) => c.marketData.symbol === id.toUpperCase()));

  useEffect(() => {
    if (storeCoin) {
      setFbLoading(false);
      return;
    }
    setFbLoading(true);
    fetchFallback(id.toUpperCase()).then((d) => { setFallback(d ?? undefined); setFbLoading(false); });
  }, [id, storeCoin]);

  if (!storeCoin && fbLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-6 h-6 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!storeCoin && !fallback && !fbLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">{t("coin_detail.not_found")}</h2>
          <Link href="/" className="text-emerald-400 hover:underline">{t("coin_detail.back_dashboard")}</Link>
        </div>
      </div>
    );
  }

  if (storeCoin) {
    return <FullDetail coin={storeCoin} />;
  }

  return <FallbackDetail data={fallback!} />;
}

function FullDetail({ coin }: { coin: CoinAnalysis }) {
  const { t, dir } = useI18n();
  const pos = getPositionLabel(coin.overallScore, coin.position);
  const posLabel = t(pos.labelKey);
  const isPositive = coin.marketData.priceChangePercent24h >= 0;
  const md = coin.marketData;
  const ti = coin.technicalIndicators;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("coin_detail.back")}
        </button>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <img src={md.image} alt={md.symbol} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{md.name}</h1>
                  <span className="text-gray-400 text-sm sm:text-lg shrink-0">{md.symbol}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shrink-0 ${pos.text} ${pos.bg}`}>
                    {posLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                  <span className="text-xl sm:text-3xl font-bold text-white truncate">
                    ${md.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                  <span className={`text-sm sm:text-lg font-medium shrink-0 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{md.priceChangePercent24h.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">{t("coin_detail.24h")}</span>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="text-xs sm:text-sm text-gray-400">{t("coin_detail.rank", { rank: md.rank })}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{t("coin_detail.updated", { time: new Date(coin.lastUpdated).toLocaleTimeString() })}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.analysis_score.title")}
              <InfoTip text={t("coin_detail.cards.analysis_score.tooltip")} />
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#1f2937" strokeWidth="6" />
                  <circle
                    cx="36" cy="36" r="30" fill="none"
                    stroke={coin.overallScore >= 60 ? "#34d399" : coin.overallScore <= 40 ? "#f87171" : "#fbbf24"}
                    strokeWidth="6"
                    strokeDasharray={`${(coin.overallScore / 100) * 188.5} 188.5`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                  {coin.overallScore}
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: t("coin_detail.subscores.volume"), score: coin.volumeScore },
                  { label: t("coin_detail.subscores.trend"), score: coin.trendScore },
                  { label: t("coin_detail.subscores.technicals"), score: coin.technicalScore },
                  { label: t("coin_detail.subscores.sentiment"), score: coin.sentimentScore },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-16">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.score >= 60 ? "bg-emerald-500" : item.score <= 40 ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span className="text-gray-300 w-4 text-right font-mono">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <ScoreInterpretation score={coin.overallScore} position={coin.position} t={t} />
          </div>

          {/* Market Stats */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.market_stats.title")}
              <InfoTip text={t("coin_detail.cards.market_stats.tooltip")} />
            </h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <StatItem label={t("coin_detail.cards.market_stats.market_cap")} value={`$${(md.marketCap / 1e9).toFixed(2)}B`} tooltip={t("coin_detail.cards.market_stats.tooltips.market_cap")} />
              <StatItem label={t("coin_detail.cards.market_stats.volume_24h")} value={`$${(md.volume24h / 1e9).toFixed(2)}B`} tooltip={t("coin_detail.cards.market_stats.tooltips.volume_24h")} />
              <StatItem label={t("coin_detail.cards.market_stats.high_24h")} value={`$${md.high24h.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.high_24h")} />
              <StatItem label={t("coin_detail.cards.market_stats.low_24h")} value={`$${md.low24h.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.low_24h")} />
              <StatItem label={t("coin_detail.cards.market_stats.ath")} value={`$${md.ath.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.ath")} />
              <StatItem label={t("coin_detail.cards.market_stats.atl")} value={`$${md.atl.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.atl")} />
              <StatItem label={t("coin_detail.cards.market_stats.circ_supply")} value={`${(md.circulatingSupply / 1e6).toFixed(1)}M ${md.symbol}`} tooltip={t("coin_detail.cards.market_stats.tooltips.circ_supply")} />
              <StatItem label={t("coin_detail.cards.market_stats.vol_mcap")} value={`${((md.volume24h / md.marketCap) * 100).toFixed(2)}%`} tooltip={t("coin_detail.cards.market_stats.tooltips.vol_mcap")} />
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.technical_indicators.title")}
              <InfoTip text={t("coin_detail.cards.technical_indicators.tooltip")} />
            </h3>
            <div className="space-y-3">
              <TechItem label={t("coin_detail.cards.technical_indicators.rsi")} value={ti.rsi.toFixed(1)} status={ti.rsi > 70 ? "overbought" : ti.rsi < 30 ? "oversold" : "neutral"} tooltip={t("coin_detail.cards.technical_indicators.tooltips.rsi")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.macd")} value={ti.macd.value.toFixed(2)} status={ti.macd.histogram > 0 ? "bullish" : "bearish"} tooltip={t("coin_detail.cards.technical_indicators.tooltips.macd")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.macd_signal")} value={ti.macd.signal.toFixed(2)} status="neutral" tooltip={t("coin_detail.cards.technical_indicators.tooltips.macd_signal")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.macd_histogram")} value={ti.macd.histogram.toFixed(2)} status={ti.macd.histogram > 0 ? "positive" : "negative"} tooltip={t("coin_detail.cards.technical_indicators.tooltips.macd_histogram")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.ema_9")} value={`$${ti.ema9.toFixed(2)}`} status={ti.ema9 > md.currentPrice ? "above" : "below"} tooltip={t("coin_detail.cards.technical_indicators.tooltips.ema_9")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.ema_21")} value={`$${ti.ema21.toFixed(2)}`} status={ti.ema21 > md.currentPrice ? "above" : "below"} tooltip={t("coin_detail.cards.technical_indicators.tooltips.ema_21")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.bb_upper")} value={`$${ti.bollingerBands.upper.toFixed(2)}`} status="neutral" tooltip={t("coin_detail.cards.technical_indicators.tooltips.bb_upper")} />
              <TechItem label={t("coin_detail.cards.technical_indicators.bb_lower")} value={`$${ti.bollingerBands.lower.toFixed(2)}`} status="neutral" tooltip={t("coin_detail.cards.technical_indicators.tooltips.bb_lower")} />
            </div>
          </div>
        </div>

        <CandlestickChart coinId={coin.coinId} />

        {/* Trend Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.trend_analysis.title")}
              <InfoTip text={t("coin_detail.cards.trend_analysis.tooltip")} />
            </h3>
            <div className="space-y-4">
              {[
                { label: t("coin_detail.cards.trend_analysis.short_term"), value: coin.trendAnalysis.shortTerm },
                { label: t("coin_detail.cards.trend_analysis.medium_term"), value: coin.trendAnalysis.mediumTerm },
                { label: t("coin_detail.cards.trend_analysis.long_term"), value: coin.trendAnalysis.longTerm },
              ].map((item) => {
                const color = item.value === "bullish" ? "text-emerald-400" : item.value === "bearish" ? "text-red-400" : "text-yellow-400";
                const icon = item.value === "bullish" ? "▲" : item.value === "bearish" ? "▼" : "◆";
                return (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{item.label}</span>
                    <span className={`font-mono font-bold ${color}`}>{icon} {t(`coin_detail.cards.trend_analysis.${item.value}`)}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-800 pt-3 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t("coin_detail.cards.trend_analysis.trend_score")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${coin.trendAnalysis.score >= 60 ? "bg-emerald-500" : coin.trendAnalysis.score <= 40 ? "bg-red-500" : "bg-yellow-500"}`}
                        style={{ width: `${coin.trendAnalysis.score}%` }}
                      />
                    </div>
                    <span className="text-white font-mono text-xs">{coin.trendAnalysis.score}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.news_sentiment.title")}
              <InfoTip text={t("coin_detail.cards.news_sentiment.tooltip")} />
            </h3>
            <div className="space-y-3">
              <div className={`px-3 py-1 rounded-lg text-xs font-bold inline-block ${coin.sentiment.overall === "positive" ? "bg-emerald-900/30 text-emerald-400" :
                coin.sentiment.overall === "negative" ? "bg-red-900/30 text-red-400" :
                "bg-yellow-900/30 text-yellow-400"
              }`}>
                {t(`coin_detail.cards.news_sentiment.${coin.sentiment.overall}`)}
              </div>
              {coin.sentiment.recentNews.length === 0 ? (
                <p className="text-xs text-gray-500">{t("coin_detail.cards.news_sentiment.no_news")}</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {coin.sentiment.recentNews.slice(0, 5).map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.sentiment === "positive" ? "bg-emerald-500" :
                        n.sentiment === "negative" ? "bg-red-500" : "bg-yellow-500"
                      }`} />
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gray-100 transition-colors">{n.title}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Support & Resistance */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.support_resistance.title")}
              <InfoTip text={t("coin_detail.cards.support_resistance.tooltip")} />
            </h3>
            <div className="space-y-2">
              {coin.technicalIndicators.supportLevels.map((level, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-800/30">
                  <span className="text-gray-400">{t("coin_detail.cards.support_resistance.support", { level: i + 1 })}</span>
                  <span className="font-mono text-emerald-400">${level.toFixed(2)}</span>
                </div>
              ))}
              {coin.technicalIndicators.resistanceLevels.map((level, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-800/30">
                  <span className="text-gray-400">{t("coin_detail.cards.support_resistance.resistance", { level: i + 1 })}</span>
                  <span className="font-mono text-red-400">${level.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FallbackDetail({ data }: { data: FallbackData }) {
  const { t, dir } = useI18n();
  const isPositive = data.changePercent >= 0;
  const pos = estimatePosition(data.changePercent);

  const posConfig: Record<string, { text: string; bg: string; labelKey: string }> = {
    long: { text: "text-emerald-400", bg: "bg-emerald-900/40", labelKey: "coin_row.long" },
    short: { text: "text-red-400", bg: "bg-red-900/40", labelKey: "coin_row.short" },
    neutral: { text: "text-yellow-400", bg: "bg-yellow-900/40", labelKey: "coin_row.neutral" },
  };
  const pc = posConfig[pos.position];

  const rsiColor =
    data.rsi > 70 ? "text-red-400" :
    data.rsi > 60 ? "text-orange-400" :
    data.rsi < 30 ? "text-emerald-400" :
    data.rsi < 40 ? "text-cyan-400" : "text-gray-300";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("coin_detail.back")}
        </button>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://assets.coincap.io/assets/icons/${data.symbol.toLowerCase()}@2x.png`}
                alt={data.symbol}
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full shrink-0"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400 shrink-0 hidden">
                {data.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{data.symbol}</h1>
                  <span className="text-gray-400 text-sm sm:text-lg shrink-0">{data.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shrink-0 ${pc.text} ${pc.bg}`}>
                    {t(pc.labelKey)}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 flex-wrap">
                  <span className="text-xl sm:text-3xl font-bold text-white truncate">
                    ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                  <span className={`text-sm sm:text-lg font-medium shrink-0 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{data.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">{t("coin_detail.24h")}</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1 shrink-0 self-start sm:self-auto">
              {t("coin_detail.data_source")}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Market Stats (from Binance) */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.market_stats.title")}
              <InfoTip text={t("coin_detail.cards.market_stats.tooltip")} />
            </h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <StatItem label={t("coin_detail.cards.market_stats.volume_24h")} value={`$${(data.volume / 1e6).toFixed(2)}M`} tooltip={t("coin_detail.cards.market_stats.tooltips.volume_24h")} />
              <StatItem label={t("coin_detail.cards.market_stats.high_24h")} value={`$${data.high24h.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.high_24h")} />
              <StatItem label={t("coin_detail.cards.market_stats.low_24h")} value={`$${data.low24h.toLocaleString()}`} tooltip={t("coin_detail.cards.market_stats.tooltips.low_24h")} />
              <div />
              <div />
              <div />
            </div>
          </div>

          {/* RSI */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.technical_indicators.title")}
              <InfoTip text={t("coin_detail.cards.technical_indicators.tooltip")} />
            </h3>
            <div className="space-y-3 text-sm">
              <TechItem
                label={t("coin_detail.cards.technical_indicators.rsi")}
                value={data.rsi.toFixed(1)}
                status={data.rsi > 70 ? "overbought" : data.rsi < 30 ? "oversold" : "neutral"}
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.rsi")}
              />
            </div>
          </div>

          {/* Signal */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("coin_detail.signal")}</h3>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1.5 rounded ${pc.bg} ${pc.text}`}>
                {t(pc.labelKey)}
              </span>
              <span className="text-xs text-gray-400">
                {t("coin_detail.score", { score: pos.score.toFixed(0) })}
              </span>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("coin_detail.price_chart")}</h3>
          <div className="rounded-lg overflow-hidden" style={{ height: 480 }}>
            <CandlestickChart coinId={data.symbol} />
          </div>
        </div>

        <div className="text-center py-8 text-sm text-gray-600">
          {t("coin_detail.fallback_message")}
        </div>
      </main>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="group relative inline-flex items-center ms-1.5"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
    >
      <svg className="w-3.5 h-3.5 text-gray-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
      </svg>
      <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-gray-700 text-xs text-gray-200 shadow-lg transition-opacity pointer-events-none z-10 ${open ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        {text}
      </span>
    </span>
  );
}

function StatItem({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs inline-flex items-center">
        {label}
        <InfoTip text={tooltip} />
      </p>
      <p className="text-gray-200 font-mono mt-0.5">{value}</p>
    </div>
  );
}

function TechItem({ label, value, status, tooltip }: { label: string; value: string; status: string; tooltip: string }) {
  const colorMap: Record<string, string> = {
    bullish: "text-emerald-400", bearish: "text-red-400", neutral: "text-gray-300",
    overbought: "text-red-400", oversold: "text-emerald-400",
    positive: "text-emerald-400", negative: "text-red-400",
    above: "text-emerald-400", below: "text-red-400",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 inline-flex items-center">
        {label}
        <InfoTip text={tooltip} />
      </span>
      <span className={`font-mono ${colorMap[status] || "text-gray-300"}`}>{value}</span>
    </div>
  );
}

function ScoreInterpretation({ score, position, t: _t }: { score: number; position: PositionType; t: (path: string, vars?: Record<string, string | number>) => string }) {
  const pl = getPositionLabel(score, position);
  return (
    <div className="border-t border-gray-800 pt-4 mt-2 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{_t("coin_detail.cards.analysis_score.interpretation.zone")}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pl.bg} ${pl.text} ${pl.border}`}>
          {_t(`coin_row.${position}`)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{_t("coin_detail.cards.analysis_score.interpretation.conviction")}</span>
        <span className={`text-xs font-bold ${pl.text}`}>
          {_t(pl.labelKey)}
        </span>
      </div>
    </div>
  );
}

function TrendBadge({ label, value }: { label: string; value: string }) {
  const trendColors: Record<string, string> = {
    bullish: "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-900/30 text-red-400 border-red-500/30",
    neutral: "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  };
  const trendLabelKey = `coin_detail.cards.trend_analysis.${value}`;
  const { t: _t } = useI18n();
  return (
    <div className={`text-center px-3 py-2 rounded-lg border text-xs font-semibold ${trendColors[value]}`}>
      <p className="text-gray-500 font-normal mb-1">{label}</p>
      {_t(trendLabelKey)}
    </div>
  );
}

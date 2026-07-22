"use client";

import { DMIIndicator } from "@/components/DMIIndicator";
import { CandlestickChart } from "@/components/CandlestickChart";
import { CoinImage } from "@/components/CoinImage";
import { OrderBook } from "@/components/OrderBook";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useI18n } from "@/i18n/context";
import { COIN_SYMBOL_MAP, fetchKlines } from "@/api/binance";
import { calcRSI, calculateTechnicalIndicatorsFromKlines, estimatePosition } from "@/lib/indicators";
import { getPositionLabel } from "@/lib/scoring";
import { CoinAnalysis, PositionType, TechnicalIndicators, Timeframe } from "@/lib/types";
import { useTimeframe } from "@/lib/timeframe";
import { useStore } from "@/store/useStore";
import { useBinanceWebSocket } from "@/store/useWebSocket";
import Link from "next/link";
import { HeroSection } from "@/components/HeroSection";
import { TradeSetupCard } from "@/components/TradeSetupCard";
import { use, useEffect, useState } from "react";

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

async function fetchFallback(symbol: string, interval: Timeframe = "1h"): Promise<FallbackData | null> {
  try {
    const [tickerRes, klinesRes] = await Promise.all([
      fetch(`${BINANCE_REST}/ticker/24hr?symbol=${symbol}USDT`),
      fetch(`${BINANCE_REST}/klines?symbol=${symbol}USDT&interval=${interval}&limit=15`),
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
  const { t } = useI18n();
  const { timeframe } = useTimeframe();
  useBinanceWebSocket();
  const { id } = use(params);
  const [fallback, setFallback] = useState<FallbackData | undefined>(undefined);
  const [fbLoading, setFbLoading] = useState(true);

  useEffect(() => { loadFromBinance(); }, [loadFromBinance]);

  const storeCoin = useStore((s) => s.coins.find((c) => c.coinId === id))
    ?? useStore((s) => s.coins.find((c) => c.marketData.symbol === id.toUpperCase()));

  useEffect(() => {
    if (storeCoin) {
      setFbLoading(false);
      return;
    }
    setFbLoading(true);
    fetchFallback(id.toUpperCase(), timeframe).then((d) => { setFallback(d ?? undefined); setFbLoading(false); });
  }, [id, storeCoin, timeframe]);

  if (!storeCoin && fbLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center">
          <div className="w-6 h-6 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!storeCoin && !fallback && !fbLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center">
          <h2 className="text-2xl font-bold mb-2">{t("coin_detail.not_found")}</h2>
          <Link href="/" className="text-emerald-400 hover:underline">{t("coin_detail.back_dashboard")}</Link>
        </div>
      </DashboardLayout>
    );
  }

  if (storeCoin) {
    return <FullDetail coin={storeCoin} />;
  }

  return <FallbackDetail data={fallback!} />;
}

function FullDetail({ coin }: { coin: CoinAnalysis }) {
  const { t, dir } = useI18n();
  const { timeframe, getLimit } = useTimeframe();
  const pos = getPositionLabel(coin.overallScore, coin.position);
  const posLabel = t(pos.labelKey);
  const isPositive = coin.marketData.priceChangePercent24h >= 0;
  const md = coin.marketData;
  const ti = coin.technicalIndicators;

  const [realTi, setRealTi] = useState<TechnicalIndicators | null>(null);

  useEffect(() => {
    let cancelled = false;
    const symbol = COIN_SYMBOL_MAP[coin.coinId] || `${md.symbol}USDT`;
    fetchKlines(symbol, timeframe, getLimit()).then((klines) => {
      if (cancelled) return;
      const closes = klines.map((k) => k.close);
      const computed = calculateTechnicalIndicatorsFromKlines(closes, md.currentPrice);
      setRealTi({
        ...computed,
        supportLevels: ti.supportLevels,
        resistanceLevels: ti.resistanceLevels,
      });
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [coin.coinId, md.symbol, md.currentPrice, timeframe]);

  const display = realTi ?? ti;

  return (
    <DashboardLayout>
        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("coin_detail.back")}
        </button>

        <HeroSection coin={coin} timeframe={timeframe} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.analysis_score.title")}
              <InfoTip text={t("coin_detail.cards.analysis_score.tooltip")} />
            </h3>
            <div className="relative w-20 h-20 mx-auto mb-4">
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
            <div className="space-y-3">
              {[
                { label: t("coin_detail.subscores.trend"), value: coin.trendScore },
                { label: t("coin_detail.subscores.momentum"), value: coin.momentumScore },
                { label: t("coin_detail.subscores.volume"), value: coin.volumeScore },
                { label: t("coin_detail.subscores.confidence"), value: coin.confidence },
                { label: t("coin_detail.subscores.trade_quality"), value: coin.tradeQuality },
                { label: t("coin_detail.subscores.risk"), value: coin.riskScore },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className={`text-xs font-mono font-bold ${
                      item.value >= 65 ? "text-emerald-400" : item.value <= 40 ? "text-red-400" : "text-yellow-400"
                    }`}>{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.value >= 65 ? "bg-emerald-500" : item.value <= 40 ? "bg-red-500" : "bg-yellow-500"
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <ScoreInterpretation score={coin.overallScore} position={coin.position} t={t} />
          </div>

          {/* Trade Setup */}
          <TradeSetupCard coin={coin} />

          {/* Technical Indicators */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.technical_indicators.title")}
              <InfoTip text={t("coin_detail.cards.technical_indicators.tooltip")} />
            </h3>
            <div>
              {/* RSI */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.rsi")}
                value={display.rsi.toFixed(1)}
                status={display.rsi > 70 ? "bearish" : display.rsi < 30 ? "bullish" : "neutral"}
                statusLabel={
                  display.rsi > 70 ? t("coin_detail.cards.tech_interpret.rsi.overbought") :
                  display.rsi < 30 ? t("coin_detail.cards.tech_interpret.rsi.oversold") :
                  t("coin_detail.cards.tech_interpret.rsi.neutral")
                }
                interpretation={
                  display.rsi > 80 ? t("coin_detail.cards.tech_interpret.rsi.extreme_overbought") :
                  display.rsi > 70 ? t("coin_detail.cards.tech_interpret.rsi.overbought_desc") :
                  display.rsi < 20 ? t("coin_detail.cards.tech_interpret.rsi.extreme_oversold") :
                  display.rsi < 30 ? t("coin_detail.cards.tech_interpret.rsi.oversold_desc") :
                  display.rsi > 55 ? t("coin_detail.cards.tech_interpret.rsi.bullish_zone") :
                  display.rsi < 45 ? t("coin_detail.cards.tech_interpret.rsi.bearish_zone") :
                  t("coin_detail.cards.tech_interpret.rsi.mid_range")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.rsi")}
              />

              {/* MACD */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.macd")}
                value={display.macd.value.toFixed(2)}
                status={display.macd.histogram > 0 ? "bullish" : display.macd.histogram < 0 ? "bearish" : "neutral"}
                statusLabel={
                  display.macd.value > display.macd.signal && display.macd.histogram > 0
                    ? t("coin_detail.cards.tech_interpret.macd.bullish_cross") :
                  display.macd.value < display.macd.signal && display.macd.histogram < 0
                    ? t("coin_detail.cards.tech_interpret.macd.bearish_cross") :
                  t("coin_detail.cards.tech_interpret.macd.neutral")
                }
                interpretation={
                  display.macd.histogram > 0 && display.macd.value > display.macd.signal
                    ? t("coin_detail.cards.tech_interpret.macd.bullish_desc") :
                  display.macd.histogram < 0 && display.macd.value < display.macd.signal
                    ? t("coin_detail.cards.tech_interpret.macd.bearish_desc") :
                  t("coin_detail.cards.tech_interpret.macd.converging")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.macd")}
              />

              {/* MACD Histogram */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.macd_histogram")}
                value={display.macd.histogram.toFixed(2)}
                status={display.macd.histogram > 0 ? "bullish" : display.macd.histogram < 0 ? "bearish" : "neutral"}
                statusLabel={
                  Math.abs(display.macd.histogram) > 1
                    ? t("coin_detail.cards.tech_interpret.histogram.strong") :
                  Math.abs(display.macd.histogram) > 0.3
                    ? t("coin_detail.cards.tech_interpret.histogram.moderate") :
                  t("coin_detail.cards.tech_interpret.histogram.weak")
                }
                interpretation={
                  display.macd.histogram > 1 ? t("coin_detail.cards.tech_interpret.histogram.strong_bullish") :
                  display.macd.histogram < -1 ? t("coin_detail.cards.tech_interpret.histogram.strong_bearish") :
                  display.macd.histogram > 0.3 ? t("coin_detail.cards.tech_interpret.histogram.moderate_bullish") :
                  display.macd.histogram < -0.3 ? t("coin_detail.cards.tech_interpret.histogram.moderate_bearish") :
                  t("coin_detail.cards.tech_interpret.histogram.fading")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.macd_histogram")}
              />

              {/* ADX */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.adx")}
                value={display.adx.toFixed(1)}
                status={display.adx >= 25 ? "bullish" : display.adx < 20 ? "bearish" : "neutral"}
                statusLabel={
                  display.adx >= 40 ? t("coin_detail.cards.tech_interpret.adx.very_strong") :
                  display.adx >= 25 ? t("coin_detail.cards.tech_interpret.adx.strong") :
                  display.adx >= 20 ? t("coin_detail.cards.tech_interpret.adx.moderate") :
                  t("coin_detail.cards.tech_interpret.adx.weak")
                }
                interpretation={
                  display.adx >= 40 ? t("coin_detail.cards.tech_interpret.adx.very_strong_desc") :
                  display.adx >= 25 ? t("coin_detail.cards.tech_interpret.adx.strong_desc") :
                  display.adx >= 20 ? t("coin_detail.cards.tech_interpret.adx.moderate_desc") :
                  t("coin_detail.cards.tech_interpret.adx.weak_desc")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.adx")}
              />

              {/* EMA Alignment */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.ema_alignment")}
                value={display.ema9 > display.ema21 && display.ema21 > display.ema50
                  ? `${display.ema9.toFixed(0)} > ${display.ema21.toFixed(0)} > ${display.ema50.toFixed(0)}`
                  : display.ema9 < display.ema21 && display.ema21 < display.ema50
                    ? `${display.ema9.toFixed(0)} < ${display.ema21.toFixed(0)} < ${display.ema50.toFixed(0)}`
                    : t("coin_detail.cards.tech_interpret.ema.mixed")
                }
                status={
                  display.ema9 > display.ema21 && display.ema21 > display.ema50 ? "bullish" :
                  display.ema9 < display.ema21 && display.ema21 < display.ema50 ? "bearish" : "neutral"
                }
                statusLabel={
                  display.ema9 > display.ema21 && display.ema21 > display.ema50
                    ? t("coin_detail.cards.tech_interpret.ema.bullish") :
                  display.ema9 < display.ema21 && display.ema21 < display.ema50
                    ? t("coin_detail.cards.tech_interpret.ema.bearish") :
                  t("coin_detail.cards.tech_interpret.ema.neutral")
                }
                interpretation={
                  display.ema9 > display.ema21 && display.ema21 > display.ema50
                    ? t("coin_detail.cards.tech_interpret.ema.bullish_desc") :
                  display.ema9 < display.ema21 && display.ema21 < display.ema50
                    ? t("coin_detail.cards.tech_interpret.ema.bearish_desc") :
                  t("coin_detail.cards.tech_interpret.ema.mixed_desc")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.ema_alignment")}
              />

              {/* ATR */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.atr")}
                value={`$${display.atr.toFixed(2)}`}
                status={
                  display.atr / md.currentPrice > 0.05 ? "bearish" :
                  display.atr / md.currentPrice > 0.02 ? "neutral" : "bullish"
                }
                statusLabel={
                  display.atr / md.currentPrice > 0.05 ? t("coin_detail.cards.tech_interpret.atr.high") :
                  display.atr / md.currentPrice > 0.02 ? t("coin_detail.cards.tech_interpret.atr.medium") :
                  t("coin_detail.cards.tech_interpret.atr.low")
                }
                interpretation={
                  display.atr / md.currentPrice > 0.05 ? t("coin_detail.cards.tech_interpret.atr.high_desc") :
                  display.atr / md.currentPrice > 0.02 ? t("coin_detail.cards.tech_interpret.atr.medium_desc") :
                  t("coin_detail.cards.tech_interpret.atr.low_desc")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.atr")}
              />

              {/* Bollinger Bands */}
              <TechIndicator
                label={t("coin_detail.cards.technical_indicators.bb_position")}
                value={
                  md.currentPrice > display.bollingerBands.upper
                    ? t("coin_detail.cards.tech_interpret.bb.above") :
                  md.currentPrice < display.bollingerBands.lower
                    ? t("coin_detail.cards.tech_interpret.bb.below") :
                  t("coin_detail.cards.tech_interpret.bb.inside")
                }
                status={
                  md.currentPrice > display.bollingerBands.upper ? "bearish" :
                  md.currentPrice < display.bollingerBands.lower ? "bullish" : "neutral"
                }
                statusLabel={
                  md.currentPrice > display.bollingerBands.upper
                    ? t("coin_detail.cards.tech_interpret.bb.upper_tag") :
                  md.currentPrice < display.bollingerBands.lower
                    ? t("coin_detail.cards.tech_interpret.bb.lower_tag") :
                  t("coin_detail.cards.tech_interpret.bb.mid_tag")
                }
                interpretation={
                  md.currentPrice > display.bollingerBands.upper
                    ? t("coin_detail.cards.tech_interpret.bb.above_desc") :
                  md.currentPrice < display.bollingerBands.lower
                    ? t("coin_detail.cards.tech_interpret.bb.below_desc") :
                  t("coin_detail.cards.tech_interpret.bb.inside_desc")
                }
                tooltip={t("coin_detail.cards.technical_indicators.tooltips.bb_position")}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">{t("coin_detail.price_chart")}</h3>
          <div className="rounded-lg overflow-hidden" style={{ height: 750 }}>
            <CandlestickChart coinId={coin.coinId} />
          </div>
        </div>

        <div className="mb-6">
          <DMIIndicator coinId={coin.coinId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Trend Analysis */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.trend_analysis.title")}
              <InfoTip text={t("coin_detail.cards.trend_analysis.tooltip")} />
            </h3>
            <div className="space-y-2">
              {(["15m", "1h", "4h", "1d"] as const).map((tf) => {
                const data = coin.trendAnalysis[tf];
                const isActive = timeframe === tf;
                const trendColor =
                  data.trend === "bullish" ? "text-emerald-400" :
                  data.trend === "bearish" ? "text-red-400" : "text-yellow-400";
                const trendIcon =
                  data.trend === "bullish" ? "▲" :
                  data.trend === "bearish" ? "▼" : "◆";
                const strengthColor =
                  data.strength === "strong" ? "text-emerald-400" :
                  data.strength === "moderate" ? "text-yellow-400" : "text-gray-500";
                return (
                  <div
                    key={tf}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-gray-800/60 border border-gray-700/50"
                        : "border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-bold w-8 ${isActive ? "text-white" : "text-gray-500"}`}>
                        {tf.toUpperCase()}
                      </span>
                      <span className={`text-sm font-semibold ${trendColor}`}>
                        {trendIcon} {t(`coin_detail.cards.trend_analysis.${data.trend}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold uppercase ${strengthColor}`}>
                        {data.strength}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              data.confidence >= 65 ? "bg-emerald-500" :
                              data.confidence <= 40 ? "bg-red-500" : "bg-yellow-500"
                            }`}
                            style={{ width: `${data.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 w-7 text-right">
                          {data.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

          {/* Sentiment */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center">
              {t("coin_detail.cards.news_sentiment.title")}
              <InfoTip text={t("coin_detail.cards.news_sentiment.tooltip")} />
            </h3>

            {/* Sentiment counts */}
            {(coin.sentiment.recentNews.length > 0) && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {coin.sentiment.recentNews.filter(n => n.sentiment === "positive").length}
                  </div>
                  <div className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-wider mt-0.5">
                    {t("coin_detail.cards.news_sentiment.positive")}
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-yellow-400 font-mono">
                    {coin.sentiment.recentNews.filter(n => n.sentiment === "neutral").length}
                  </div>
                  <div className="text-[10px] text-yellow-400/70 font-semibold uppercase tracking-wider mt-0.5">
                    {t("coin_detail.cards.news_sentiment.neutral")}
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
                  <div className="text-lg font-bold text-red-400 font-mono">
                    {coin.sentiment.recentNews.filter(n => n.sentiment === "negative").length}
                  </div>
                  <div className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider mt-0.5">
                    {t("coin_detail.cards.news_sentiment.negative")}
                  </div>
                </div>
              </div>
            )}

            {/* News items or empty state */}
            {coin.sentiment.recentNews.length === 0 ? (
              <p className="text-xs text-gray-500 leading-relaxed">
                {t("coin_detail.cards.news_sentiment.no_news")}
              </p>
            ) : (
              <div className="space-y-3">
                {coin.sentiment.recentNews.slice(0, 3).map((n) => {
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(n.publishedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 60) return t("common.min_ago", { count: mins });
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return t("common.hour_ago", { count: hrs });
                    const days = Math.floor(hrs / 24);
                    return t("common.day_ago", { count: days });
                  })();

                  const impactColor = n.sentiment === "positive"
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : n.sentiment === "negative"
                      ? "border-red-500/30 text-red-400 bg-red-500/10"
                      : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10";

                  const impactLabel = n.sentiment === "positive" ? t("coin_detail.cards.news_sentiment.positive") : n.sentiment === "negative" ? t("coin_detail.cards.news_sentiment.negative") : t("coin_detail.cards.news_sentiment.neutral");

                  return (
                    <div key={n.id} className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-3">
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-gray-200 hover:text-white transition-colors line-clamp-2 leading-relaxed"
                      >
                        {n.title}
                      </a>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${impactColor}`}>
                          {impactLabel}
                        </span>
                        <span className="text-[10px] text-gray-500">{timeAgo}</span>
                        <span className="text-[10px] text-gray-600">{n.source}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

        {/* Order Book */}
        <div className="mt-6">
          <OrderBook symbol={COIN_SYMBOL_MAP[coin.coinId] || `${md.symbol}USDT`} />
        </div>
    </DashboardLayout>
  );
}

function FallbackDetail({ data }: { data: FallbackData }) {
  const { t, dir } = useI18n();
  const { timeframe } = useTimeframe();
  const isPositive = data.changePercent >= 0;
  const pos = estimatePosition(data.changePercent);

  const posConfig: Record<string, { text: string; bg: string; labelKey: string }> = {
    long: { text: "text-emerald-400", bg: "bg-emerald-900/30", labelKey: "coin_row.long" },
    short: { text: "text-red-400", bg: "bg-red-900/30", labelKey: "coin_row.short" },
    neutral: { text: "text-yellow-400", bg: "bg-yellow-900/30", labelKey: "coin_row.neutral" },
  };
  const pc = posConfig[pos.position];

  const rsiColor =
    data.rsi > 70 ? "text-red-400" :
      data.rsi > 60 ? "text-orange-400" :
        data.rsi < 30 ? "text-emerald-400" :
          data.rsi < 40 ? "text-cyan-400" : "text-gray-300";

  return (
    <DashboardLayout>
        <button onClick={() => window.history.back()} className="text-gray-400 hover:text-gray-200 text-sm mb-6 inline-flex items-center gap-1">
          <span>{dir === "rtl" ? "→" : "←"}</span>
          {t("coin_detail.back")}
        </button>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <CoinImage
                src={`https://assets.coincap.io/assets/icons/${data.symbol.toLowerCase()}@2x.png`}
                alt={data.symbol}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full shrink-0"
                size={64}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{data.symbol}</h1>
                  <span className="text-gray-400 text-sm sm:text-base font-medium shrink-0">{data.name}</span>
                </div>
                <div className="flex items-baseline gap-2.5 mt-1 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                  <span className={`text-sm sm:text-base font-semibold tabular-nums shrink-0 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{data.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">{t("coin_detail.24h")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-gray-500/10 border-gray-500/20 shrink-0">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-xs font-medium text-gray-400">{t("coin_detail.data_source")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800/50 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {t("coin_detail.hero.analysis_period", { timeframe: t("timeframe." + timeframe) })}
            </span>
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
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>
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
          <div className="rounded-lg overflow-hidden" style={{ height: 750 }}>
            <CandlestickChart coinId={data.symbol} />
          </div>
        </div>

        <div className="mb-6">
          <DMIIndicator coinId={data.symbol} />
        </div>

        <div className="text-center py-8 text-sm text-gray-600">
          {t("coin_detail.fallback_message")}
        </div>
    </DashboardLayout>
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

function TechItem({
  label,
  value,
  status,
  tooltip,
}: {
  label: string;
  value: string;
  status: "overbought" | "oversold" | "neutral";
  tooltip: string;
}) {
  const color = status === "overbought" ? "text-red-400" : status === "oversold" ? "text-emerald-400" : "text-gray-400";
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <InfoTip text={tooltip} />
      </div>
      <span className={`font-mono font-bold text-sm ${color}`}>{value}</span>
    </div>
  );
}

function TechIndicator({
  label,
  value,
  status,
  statusLabel,
  interpretation,
  tooltip,
}: {
  label: string;
  value: string;
  status: "bullish" | "bearish" | "neutral";
  statusLabel: string;
  interpretation: string;
  tooltip: string;
}) {
  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    bullish: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    bearish: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
    neutral: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-400" },
  };
  const s = statusStyles[status] || statusStyles.neutral;

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">{label}</span>
          <InfoTip text={tooltip} />
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{interpretation}</p>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-sm font-mono font-bold text-white">{value}</span>
        <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.text}`}>
          <span className={`w-1 h-1 rounded-full ${s.dot}`} />
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

function ScoreInterpretation({ score, position, t: _t }: { score: number; position: PositionType; t: (path: string, vars?: Record<string, string | number>) => string }) {
  const pl = getPositionLabel(score, position);
  return (
    <div className="border-t border-gray-800 pt-4 mt-2 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{_t("coin_detail.cards.analysis_score.interpretation.zone")}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pl.bg} ${pl.text} ${pl.border}`}>
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



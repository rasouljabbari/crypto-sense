"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/context";
import { useTimeframe } from "@/lib/timeframe";
import { useCoinAnalysis } from "@/features/coin-analysis/hooks/useCoinAnalysis";
import type { CoinAnalysisState } from "@/features/coin-analysis/types";
import type { SrLine } from "@/components/CandlestickChart";
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
  const { timeframe } = useTimeframe();
  const analysis = useCoinAnalysis(coinId, timeframe);

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

  const srLines: SrLine[] = [];
  const parsePrice = (s: string) => parseFloat(s.replace(/[$,]/g, ""));
  if (analysis.market.srLevels) {
    for (const l of analysis.market.srLevels) {
      srLines.push({
        price: parsePrice(l.price),
        type: l.type,
        priceRange: l.priceRange,
        confidence: l.strength != null ? l.strength * 20 : undefined,
        strength: undefined,
        reason: l.reason,
        detectedTimeframes: l.detectedTimeframes,
        touchCount: l.touchCount,
        volumeQuality: l.volumeQuality,
        alignmentScore: l.alignmentScore,
        reactionStrength: l.reactionStrength,
      });
    }
  } else {
    // Fallback: single nearest levels
    if (analysis.market.srSupport) {
      srLines.push({ price: parsePrice(analysis.market.srSupport.price), type: "support" });
    }
    if (analysis.market.srResistance) {
      srLines.push({ price: parsePrice(analysis.market.srResistance.price), type: "resistance" });
    }
  }

  return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SignalCard analysis={analysis} />
          {analysis.trends.length > 0 && (
            <Card title={t("coin_detail.cards.trend_analysis.title")}>
              <div className="space-y-2.5">
                {analysis.trends.map((tf) => {
                  const trendColor =
                    tf.trend.toLowerCase().includes("bullish") ? "text-emerald-400" :
                    tf.trend.toLowerCase().includes("bearish") ? "text-red-400" : "text-yellow-400";
                  const trendIcon =
                    tf.trend.toLowerCase().includes("bullish") ? "▲" :
                    tf.trend.toLowerCase().includes("bearish") ? "▼" : "◆";
                  const sl = tf.confidence >= 75
                    ? { label: t("coin_analysis.strength.strong"), color: "text-emerald-400", bg: "bg-emerald-500/10" }
                    : tf.confidence >= 55
                      ? { label: t("coin_analysis.strength.moderate"), color: "text-yellow-400", bg: "bg-yellow-500/10" }
                      : { label: t("coin_analysis.strength.weak"), color: "text-gray-400", bg: "bg-gray-500/10" };
                  return (
                    <div
                      key={tf.timeframe}
                      className={`rounded-lg p-3 transition-all ${
                        tf.isActive
                          ? "bg-gray-800/70 border border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.08)]"
                          : "bg-gray-800/30 border border-gray-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          tf.isActive ? "text-emerald-300" : "text-gray-500"
                        }`}>
                          {tf.timeframe.toUpperCase()}
                        </span>
                        {tf.isActive && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/70">
                            {t("coin_analysis.active")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="text-xl font-bold leading-none">{trendIcon}</span>
                        <span className={`text-sm font-bold ${trendColor}`}>
                          {t(`coin_analysis.score.status.${tf.trend.toLowerCase().replace(/\s+/g, "_")}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sl.bg} ${sl.color}`}>
                          {sl.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tf.confidence >= 75 ? "bg-emerald-500" :
                                tf.confidence >= 55 ? "bg-yellow-500" : "bg-gray-500"
                              }`}
                              style={{ width: `${tf.confidence}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-gray-400 w-7 text-right">
                            {tf.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          <ScoreOverview analysis={analysis} />
        </div>
        {analysis.indicators.length > 0 && <TechIndicatorsCard indicators={analysis.indicators} />}
        <ChartSection coinId={coinId} srLines={srLines} />
      </div>
  );
}

function ChartSection({ coinId, srLines }: { readonly coinId: string; readonly srLines?: SrLine[] }) {
  return (
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl overflow-hidden" style={{ height: 480 }}>
      <CandlestickChart coinId={coinId} srLines={srLines} />
    </div>
  );
}

function SignalCard({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();
  const s = analysis.overallScore.signal;
  const isAction = s === "Strong Buy" || s === "Buy";
  const isWait = s === "Strong Sell" || s === "Sell";
  const reasons = buildSignalReasons(analysis, t);

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

  const accentColor = isAction
    ? "text-emerald-400 border-emerald-500/20"
    : isWait
      ? "text-red-400 border-red-500/20"
      : "text-yellow-400 border-yellow-500/20";

  const bulletIcon = isAction ? "✓" : isWait ? "×" : "●";

  return (
    <Card
      title={t("coin_analysis.recommendation.title")}
      subtitle={`${analysis.overallScore.value.toFixed(0)} — ${t("coin_row." + analysis.overallScore.signal.toLowerCase().replace(" ", "_"))}`}
    >
      <div className="space-y-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${badgeColor}`}>
          {actionLabel}
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          {analysis.explanation.summary}
        </p>

        {analysis.explanation.strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.strengths")}
            </p>
            <ul className="space-y-0.5">
              {analysis.explanation.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.explanation.weaknesses.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.weaknesses")}
            </p>
            <ul className="space-y-0.5">
              {analysis.explanation.weaknesses.map((w, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">−</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.explanation.risks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1.5">
              {t("coin_analysis.explanation.risks")}
            </p>
            <ul className="space-y-0.5">
              {analysis.explanation.risks.map((r, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-yellow-400 mt-0.5 shrink-0">!</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Signal reasons merged from WhyThisSignal */}
        {reasons.length > 0 && (
          <div className="border-t border-gray-800 pt-3 mt-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t("coin_analysis.signal_reasons.title")}
            </p>
            <div className="space-y-1.5">
              {reasons.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${accentColor} bg-gray-800/20`}
                >
                  <span className={`text-[10px] font-bold shrink-0 ${accentColor.split(" ")[0]}`}>
                    {bulletIcon}
                  </span>
                  <span className="text-[11px] text-gray-300">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function translateIndicatorLabel(ind: CoinAnalysisState["indicators"][number], t: (key: string) => string): string {
  const map: Record<string, Record<string, string>> = {
    rsi: { "Overbought": "coin_detail.cards.tech_interpret.rsi.overbought", "Oversold": "coin_detail.cards.tech_interpret.rsi.oversold", "Neutral": "coin_detail.cards.tech_interpret.rsi.neutral" },
    macd: { "Bullish Cross": "coin_detail.cards.tech_interpret.macd.bullish_cross", "Bearish Cross": "coin_detail.cards.tech_interpret.macd.bearish_cross", "Converging": "coin_detail.cards.tech_interpret.macd.converging" },
    adx: { "Very Strong Trend": "coin_detail.cards.tech_interpret.adx.very_strong", "Strong Trend": "coin_detail.cards.tech_interpret.adx.strong", "Moderate Trend": "coin_detail.cards.tech_interpret.adx.moderate", "Weak Trend": "coin_detail.cards.tech_interpret.adx.weak" },
    ema: { "Bullish Alignment": "coin_detail.cards.tech_interpret.ema.bullish", "Bearish Alignment": "coin_detail.cards.tech_interpret.ema.bearish", "Mixed": "coin_detail.cards.tech_interpret.ema.mixed" },
    atr: { "High Volatility": "coin_detail.cards.tech_interpret.atr.high", "Medium Volatility": "coin_detail.cards.tech_interpret.atr.medium", "Low Volatility": "coin_detail.cards.tech_interpret.atr.low" },
    bb: { "Above Upper Band": "coin_detail.cards.tech_interpret.bb.above", "Below Lower Band": "coin_detail.cards.tech_interpret.bb.below", "Inside Bands": "coin_detail.cards.tech_interpret.bb.inside" },
  };
  const key = map[ind.key]?.[ind.statusLabel];
  return key ? t(key) : ind.statusLabel;
}

function translateIndicatorInterpretation(ind: CoinAnalysisState["indicators"][number], t: (key: string) => string): string {
  return t("coin_analysis.interpretations." + ind.key + "_" + ind.interpretation);
}

const REASON_STATIC_MAP: Record<string, string> = {
  "Strong bullish alignment: EMA20 > EMA50 > EMA200": "strong_bullish_alignment",
  "Bullish partial alignment: EMA20 > EMA50": "bullish_partial_alignment",
  "Strong bearish alignment: EMA20 < EMA50 < EMA200": "strong_bearish_alignment",
  "Bearish partial alignment: EMA20 < EMA50": "bearish_partial_alignment",
  "Mixed EMA alignment": "mixed_ema_alignment",
  "Price above EMA50": "price_above_ema50",
  "Price below EMA50": "price_below_ema50",
  "Price above EMA200": "price_above_ema200",
  "Price below EMA200": "price_below_ema200",
  "Bullish MACD cross": "bullish_macd_cross",
  "MACD above signal": "macd_above_signal",
  "Bearish MACD cross": "bearish_macd_cross",
  "MACD below signal": "macd_below_signal",
  "OBV rising": "obv_rising",
  "OBV falling": "obv_falling",
  "OBV stable": "obv_stable",
  "Price above upper Bollinger Band (overbought)": "bb_above_upper",
  "Price below lower Bollinger Band (oversold)": "bb_below_lower",
  "Price inside Bollinger Bands": "bb_inside",
  "All dimensions agree": "all_dims_agree",
  "Most dimensions agree": "most_dims_agree",
  "Mixed signals": "mixed_signals",
  "Conflicting signals": "conflicting_signals",
  "All data available": "all_data_available",
  "Some data missing": "some_data_missing",
  "Significant data missing": "significant_data_missing",
};

interface ReasonPattern { regex: RegExp; key: string; }
const REASON_PATTERNS: ReasonPattern[] = [
  { regex: /^Strong trend: ADX = ([\d.]+)$/, key: "strong_trend_adx" },
  { regex: /^Trending: ADX = ([\d.]+)$/, key: "trending_adx" },
  { regex: /^Weak trend: ADX = ([\d.]+)$/, key: "weak_trend_adx" },
  { regex: /^No clear trend: ADX = ([\d.]+)$/, key: "no_clear_trend_adx" },
  { regex: /^Oversold: RSI = ([\d.]+)$/, key: "oversold_rsi" },
  { regex: /^Low: RSI = ([\d.]+)$/, key: "low_rsi" },
  { regex: /^Neutral: RSI = ([\d.]+)$/, key: "neutral_rsi" },
  { regex: /^High: RSI = ([\d.]+)$/, key: "high_rsi" },
  { regex: /^Overbought: RSI = ([\d.]+)$/, key: "overbought_rsi" },
  { regex: /^Strong upward: \+([\d.]+)%$/, key: "strong_upward_price" },
  { regex: /^Upward: \+([\d.]+)%$/, key: "upward_price" },
  { regex: /^Slightly upward: \+([\d.]+)%$/, key: "slightly_upward" },
  { regex: /^Slightly downward: ([+-]?[\d.]+)%$/, key: "slightly_downward" },
  { regex: /^Downward: ([+-]?[\d.]+)%$/, key: "downward_price" },
  { regex: /^Strong downward: ([+-]?[\d.]+)%$/, key: "strong_downward" },
  { regex: /^Oversold: StochRSI = ([\d.]+)$/, key: "oversold_stochrsi" },
  { regex: /^Overbought: StochRSI = ([\d.]+)$/, key: "overbought_stochrsi" },
  { regex: /^High activity: Vol\/MCap = ([\d.]+)$/, key: "high_vol_mcap" },
  { regex: /^Moderate activity: Vol\/MCap = ([\d.]+)$/, key: "moderate_vol_mcap" },
  { regex: /^Low activity: Vol\/MCap = ([\d.]+)$/, key: "low_vol_mcap" },
  { regex: /^Very low activity: Vol\/MCap = ([\d.]+)$/, key: "very_low_vol_mcap" },
  { regex: /^Low volatility: ATR% = ([\d.]+)%$/, key: "low_volatility_atr" },
  { regex: /^Normal volatility: ATR% = ([\d.]+)%$/, key: "normal_volatility_atr" },
  { regex: /^High volatility: ATR% = ([\d.]+)%$/, key: "high_volatility_atr" },
  { regex: /^Extreme volatility: ATR% = ([\d.]+)%$/, key: "extreme_volatility_atr" },
  { regex: /^High liquidity: Vol = \$([\d.]+)[A-Z]+$/, key: "high_liquidity" },
  { regex: /^Medium liquidity: Vol = \$([\d.]+)[A-Z]+$/, key: "medium_liquidity" },
  { regex: /^Low liquidity: Vol = \$([\d.]+)[A-Z]+$/, key: "low_liquidity" },
  { regex: /^Very low liquidity: Vol = \$([\d.]+)[A-Z]+$/, key: "very_low_liquidity" },
  { regex: /^Wide S\/R range: ([\d.]+)%$/, key: "wide_sr_range" },
  { regex: /^Normal S\/R range: ([\d.]+)%$/, key: "normal_sr_range" },
  { regex: /^Tight S\/R range: ([\d.]+)%$/, key: "tight_sr_range" },
  { regex: /^Clear direction: ADX = ([\d.]+)$/, key: "clear_direction_adx" },
  { regex: /^Moderate direction: ADX = ([\d.]+)$/, key: "moderate_direction_adx" },
  { regex: /^Choppy market: ADX = ([\d.]+)$/, key: "choppy_market_adx" },
];

function translateScoreReason(reason: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const staticKey = REASON_STATIC_MAP[reason];
  if (staticKey) return t("coin_analysis.reasons." + staticKey);
  for (const p of REASON_PATTERNS) {
    const m = reason.match(p.regex);
    if (m) return t("coin_analysis.reasons." + p.key, { value: m[1] });
  }
  return reason;
}

function TechIndicatorsCard({ indicators }: { readonly indicators: readonly CoinAnalysisState["indicators"][number][] }) {
  const { t } = useI18n();

  const statusStyles: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
    bullish: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", ring: "ring-emerald-500/30" },
    bearish: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", ring: "ring-red-500/30" },
    neutral: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-400", ring: "ring-gray-500/30" },
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("coin_detail.cards.technical_indicators.title")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((ind) => {
          const s = statusStyles[ind.status] || statusStyles.neutral;
          const isNumeric = /^[0-9.\-]+$/.test(ind.value);
          return (
            <div
              key={ind.key}
              className={`relative bg-gray-800/30 border border-gray-800/50 rounded-lg p-4 transition-colors hover:border-gray-700`}
            >
              {/* Label */}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {ind.label}
              </span>

              {/* Value + Status row */}
              <div className="flex items-end gap-3 mt-1.5 mb-2">
                {isNumeric ? (
                  <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${s.text}`}>
                    {ind.value}
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${s.bg} ${s.text} ring-1 ${s.ring}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {translateIndicatorLabel(ind, t)}
                </span>
              </div>

              {/* Interpretation */}
              <p className="text-[11px] text-gray-500 leading-tight">
                {translateIndicatorInterpretation(ind, t)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildSignalReasons(a: CoinAnalysisState, t: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const reasons: string[] = [];
  const sig = a.overallScore.signal;
  const ind = a.indicators;
  const sc = a.scores;
  const ts = a.tradeSetup;

  const indByKey = (k: string) => ind.find((i) => i.key === k);

  if (sig === "Strong Buy" || sig === "Buy") {
    const ema = indByKey("ema");
    if (ema?.status === "bullish") reasons.push(t("coin_analysis.signal_reasons.ema_bullish"));

    const macd = indByKey("macd");
    if (macd?.statusLabel === "Bullish Cross") reasons.push(t("coin_analysis.signal_reasons.macd_bullish_cross"));

    const rsi = indByKey("rsi");
    if (rsi?.statusLabel === "Oversold") reasons.push(t("coin_analysis.signal_reasons.rsi_oversold_recovery"));
    else if (rsi?.status === "bullish") reasons.push(t("coin_analysis.signal_reasons.rsi_bullish"));

    const adx = indByKey("adx");
    if (adx?.statusLabel === "Strong Trend") {
      reasons.push(adx.interpretation === "Buyers in Control" ? t("coin_analysis.signal_reasons.buyers_in_control") : t("coin_analysis.signal_reasons.strong_trend_momentum"));
    } else if (adx?.statusLabel === "Very Strong Trend") {
      reasons.push(t("coin_analysis.signal_reasons.high_conviction_trend"));
    }

    if (sc.volume.value >= 60) reasons.push(t("coin_analysis.signal_reasons.volume_confirmation"));

    if (ts.riskReward && ts.riskReward.tp1 >= 1.5) {
      reasons.push(t("coin_analysis.signal_reasons.risk_reward", { ratio: ts.riskReward.tp1.toFixed(1) }));
    }

    if (sc.momentum.value >= 60) reasons.push(t("coin_analysis.signal_reasons.momentum_positive"));

    if (reasons.length < 7 && a.confidence >= 70) reasons.push(t("coin_analysis.signal_reasons.high_confidence"));
  } else if (sig === "Strong Sell" || sig === "Sell") {
    const ema = indByKey("ema");
    if (ema?.status === "bearish") reasons.push(t("coin_analysis.signal_reasons.ema_bearish"));

    const macd = indByKey("macd");
    if (macd?.statusLabel === "Bearish Cross") reasons.push(t("coin_analysis.signal_reasons.macd_bearish_cross"));
    else if (macd?.status === "bearish") reasons.push(t("coin_analysis.signal_reasons.macd_bearish"));

    const rsi = indByKey("rsi");
    if (rsi?.statusLabel === "Overbought") reasons.push(t("coin_analysis.signal_reasons.rsi_overbought"));

    const adx = indByKey("adx");
    if (adx?.statusLabel === "Weak Trend" || adx?.statusLabel === "Moderate Trend") reasons.push(t("coin_analysis.signal_reasons.trend_momentum_weak"));

    if (sc.volume.value < 40) reasons.push(t("coin_analysis.signal_reasons.weak_volume"));

    if (sc.risk.value < 40) reasons.push(t("coin_analysis.signal_reasons.elevated_risk"));

    if (sc.momentum.value < 40) reasons.push(t("coin_analysis.signal_reasons.momentum_negative"));
    else if (sc.momentum.value < 50) reasons.push(t("coin_analysis.signal_reasons.momentum_fading"));

    if (reasons.length < 7 && a.market.srSupport) reasons.push(t("coin_analysis.signal_reasons.price_near_support"));
  } else {
    if (sc.risk.value < 40) reasons.push(t("coin_analysis.signal_reasons.high_risk"));
    if (sc.trend.value < 40) reasons.push(t("coin_analysis.signal_reasons.weak_trend"));
    if (sc.volume.value < 40) reasons.push(t("coin_analysis.signal_reasons.low_volume"));
    if (sc.momentum.value >= 40 && sc.momentum.value < 60) reasons.push(t("coin_analysis.signal_reasons.mixed_momentum"));
    if (a.confidence < 50) reasons.push(t("coin_analysis.signal_reasons.low_confidence"));

    const adx = indByKey("adx");
    if (adx?.statusLabel === "Weak Trend" || adx?.statusLabel === "Moderate Trend") reasons.push(t("coin_analysis.signal_reasons.market_ranging"));

    if (!ts.hasTrade) {
      reasons.push(t("coin_analysis.signal_reasons.invalid_trade_setup"));
    } else {
      if (ts.entry && a.market.price) {
        const currentPrice = parseFloat(a.market.price.replace(/[$,]/g, ""));
        if (!isNaN(currentPrice) && ts.entry) {
          if (ts.direction === "long" && currentPrice > ts.entry) reasons.push(t("coin_analysis.signal_reasons.price_above_entry"));
          if (ts.direction === "short" && currentPrice < ts.entry) reasons.push(t("coin_analysis.signal_reasons.price_below_entry"));
        }
      }
      if (reasons.length < 4 && sc.volume.value >= 40 && sc.volume.value < 60) reasons.push(t("coin_analysis.signal_reasons.volume_neutral"));
    }
  }

  return reasons.slice(0, 7);
}



function ScoreOverview({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();
  const { scores, overallScore } = analysis;

  function scoreColor(v: number): string {
    if (v >= 65) return "bg-emerald-500";
    if (v >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function scoreTextColor(v: number): string {
    if (v >= 65) return "text-emerald-400";
    if (v >= 40) return "text-yellow-400";
    return "text-red-400";
  }

  interface MetricRow {
    key: string;
    label: string;
    value: number;
    reasons: string[];
  }

  const metrics: MetricRow[] = [
    {
      key: "overall",
      label: t("coin_analysis.score.overall"),
      value: overallScore.value,
      reasons: [],
    },
    {
      key: "trend",
      label: t("coin_analysis.score.trend"),
      value: scores.trend.value,
      reasons: scores.trend.reasons,
    },
    {
      key: "momentum",
      label: t("coin_analysis.score.momentum"),
      value: scores.momentum.value,
      reasons: scores.momentum.reasons,
    },
    {
      key: "volume",
      label: t("coin_analysis.score.volume"),
      value: scores.volume.value,
      reasons: scores.volume.reasons,
    },
    {
      key: "confidence",
      label: t("coin_analysis.score.confidence"),
      value: analysis.confidence,
      reasons: [],
    },
    {
      key: "trade_quality",
      label: t("coin_analysis.score.trade_quality"),
      value: analysis.tradeQuality,
      reasons: [],
    },
    {
      key: "risk",
      label: t("coin_analysis.score.risk"),
      value: scores.risk.value,
      reasons: scores.risk.reasons,
    },
  ];

  return (
    <Card
      title={t("coin_analysis.score.title")}
      subtitle={`${overallScore.value.toFixed(0)} — ${t("coin_row." + overallScore.signal.toLowerCase().replace(" ", "_"))}`}
    >
      <div className="space-y-3">
        {metrics.map((m) => (
          <div key={m.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300 font-medium">{m.label}</span>
              <span className={`text-xs font-bold font-mono tabular-nums ${scoreTextColor(m.value)}`}>
                {m.value}
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreColor(m.value)}`}
                style={{ width: `${m.value}%` }}
              />
            </div>
            {m.reasons.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                {m.reasons.map((r, i) => {
                  const displayText = translateScoreReason(r, t);
                  const isPositive = r.startsWith("+") || r.startsWith("↑");
                  const isNegative = r.startsWith("-") || r.startsWith("↓");
                  return (
                    <span
                      key={i}
                      className={`text-[10px] leading-tight ${
                        isPositive ? "text-emerald-500" : isNegative ? "text-red-400" : "text-gray-500"
                      }`}
                    >
                      {displayText}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}



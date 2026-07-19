"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/context";
import { useTimeframe } from "@/lib/timeframe";
import { useCoinAnalysis } from "@/features/coin-analysis/hooks/useCoinAnalysis";
import type { CoinAnalysisState, SrLevelDisplay } from "@/features/coin-analysis/types";
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

  return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SignalCard explanation={analysis.explanation} overallScore={analysis.overallScore} />
          <TradeSetupCard analysis={analysis} />
          <ScoreOverview analysis={analysis} />
        </div>
        <WhyThisSignalCard analysis={analysis} />
        {analysis.trends.length > 0 && <TrendAnalysisCard analysis={analysis} />}
        {analysis.indicators.length > 0 && <TechIndicatorsCard indicators={analysis.indicators} />}
        {(analysis.market.srSupport || analysis.market.srResistance) && (
          <SupportResistanceCard
            support={analysis.market.srSupport}
            resistance={analysis.market.srResistance}
          />
        )}
        <ChartSection coinId={coinId} />
      </div>
  );
}

function ChartSection({ coinId }: { readonly coinId: string }) {
  return (
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl overflow-hidden" style={{ height: 480 }}>
      <CandlestickChart coinId={coinId} />
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

function TradeSetupCard({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();
  const ts = analysis.tradeSetup;
  const price = analysis.market.price;
  const isLong = ts.direction === "long";
  const hasValidTrade = ts.hasTrade && ts.entry && ts.stopLoss && ts.takeProfit;

  function fmtPrice(v: number): string {
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  }

  /* ── No valid setup ──────────────────────────────── */
  if (!hasValidTrade) {
    return (
      <Card title={t("coin_analysis.trade_setup.title")}>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-800/60 border border-gray-700 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-400">
            {t("coin_analysis.trade_setup.no_trade")}
          </p>
          {analysis.tradeReason && (
            <p className="text-xs text-gray-500 text-center max-w-[240px] leading-relaxed">
              {analysis.tradeReason}
            </p>
          )}
        </div>
      </Card>
    );
  }

  /* ── Active trade setup ──────────────────────────── */
  const rrPrimary = ts.riskReward!.tp1;
  const rrDisplay = `1:${rrPrimary.toFixed(1)}`;

  const expectedProfitPct = isLong
    ? ((ts.takeProfit!.tp1 - ts.entry!) / ts.entry!) * 100
    : ((ts.entry! - ts.takeProfit!.tp1) / ts.entry!) * 100;
  const expectedLossPct = isLong
    ? ((ts.entry! - ts.stopLoss!) / ts.entry!) * 100
    : ((ts.stopLoss! - ts.entry!) / ts.entry!) * 100;

  const directionLabel = isLong
    ? t("coin_analysis.trade_setup.long")
    : t("coin_analysis.trade_setup.short");

  const riskLevelLabel = (() => {
    const r = analysis.scores.risk.value;
    if (r >= 80) return t("coin_row.risk_very_low");
    if (r >= 60) return t("coin_row.risk_low");
    if (r >= 40) return t("coin_row.risk_medium");
    if (r >= 20) return t("coin_row.risk_high");
    return t("coin_row.risk_extreme");
  })();

  const riskColor = (() => {
    const r = analysis.scores.risk.value;
    if (r >= 60) return "text-emerald-400";
    if (r >= 40) return "text-yellow-400";
    return "text-red-400";
  })();

  const rows: { label: string; value: string; color?: string; icon?: React.ReactNode }[] = [
    {
      label: t("coin_analysis.trade_setup.direction"),
      value: directionLabel,
      color: isLong ? "text-emerald-400" : "text-red-400",
      icon: (
        <svg className={`w-3.5 h-3.5 ${isLong ? "text-emerald-400" : "text-red-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={isLong ? "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" : "M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"} />
        </svg>
      ),
    },
    {
      label: t("coin_analysis.trade_setup.entry"),
      value: fmtPrice(ts.entry!),
      color: "text-cyan-400",
    },
    {
      label: t("coin_analysis.trade_setup.current_price"),
      value: price ?? "—",
      color: "text-white",
    },
    {
      label: t("coin_analysis.trade_setup.stop_loss"),
      value: fmtPrice(ts.stopLoss!),
      color: "text-red-400",
    },
    {
      label: t("coin_analysis.trade_setup.take_profit"),
      value: fmtPrice(ts.takeProfit!.tp1),
      color: "text-emerald-400",
    },
    {
      label: t("coin_analysis.trade_setup.risk_reward"),
      value: rrDisplay,
      color: rrPrimary >= 2 ? "text-emerald-400" : "text-yellow-400",
    },
    {
      label: t("coin_analysis.trade_setup.expected_profit"),
      value: `+${expectedProfitPct.toFixed(2)}%`,
      color: "text-emerald-400",
    },
    {
      label: t("coin_analysis.trade_setup.expected_loss"),
      value: `-${Math.abs(expectedLossPct).toFixed(2)}%`,
      color: "text-red-400",
    },
    {
      label: t("coin_analysis.trade_setup.risk_level"),
      value: riskLevelLabel,
      color: riskColor,
    },
  ];

  return (
    <Card title={t("coin_analysis.trade_setup.title")}>
      <div className="space-y-0">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between py-2.5 ${
              i < rows.length - 1 ? "border-b border-gray-800/50" : ""
            }`}
          >
            <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
              {row.icon}
              {row.label}
            </span>
            <span className={`text-sm font-bold font-mono tabular-nums ${row.color ?? "text-gray-200"}`}>
              {row.value}
            </span>
          </div>
        ))}
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
                {ind.interpretation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SupportResistanceCard({
  support,
  resistance,
}: {
  readonly support: SrLevelDisplay | null | undefined;
  readonly resistance: SrLevelDisplay | null | undefined;
}) {
  const { t } = useI18n();
  const starString = (n: number): string => {
    const capped = Math.min(5, Math.max(0, Math.round(n)));
    return "★".repeat(capped) + "☆".repeat(5 - capped);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("order_book.sr_title")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Support */}
        <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
            {t("order_book.sr_support")}
          </div>
          {support ? (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mb-1">
                {support.price}
              </div>
              <div className="text-xs text-emerald-400/70 mb-2">
                {t("order_book.sr_percent_below", { pct: support.distancePercent.toFixed(1) })}
              </div>
              <div className="text-sm tracking-wider text-emerald-400">
                {starString(support.strength)}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">{t("order_book.sr_no_support")}</div>
          )}
        </div>

        {/* Resistance */}
        <div className="bg-gray-800/30 border border-gray-800/50 rounded-lg p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
            {t("order_book.sr_resistance")}
          </div>
          {resistance ? (
            <>
              <div className="text-2xl font-bold font-mono tabular-nums text-red-400 mb-1">
                {resistance.price}
              </div>
              <div className="text-xs text-red-400/70 mb-2">
                {t("order_book.sr_percent_above", { pct: resistance.distancePercent.toFixed(1) })}
              </div>
              <div className="text-sm tracking-wider text-red-400">
                {starString(resistance.strength)}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">{t("order_book.sr_no_resistance")}</div>
          )}
        </div>
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

function WhyThisSignalCard({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();
  const reasons = buildSignalReasons(analysis, t);
  const sig = analysis.overallScore.signal;
  const isAction = sig === "Strong Buy" || sig === "Buy";
  const isWait = sig === "Strong Sell" || sig === "Sell";

  const accentColor = isAction
    ? "text-emerald-400 border-emerald-500/20"
    : isWait
      ? "text-red-400 border-red-500/20"
      : "text-yellow-400 border-yellow-500/20";

  const bulletIcon = isAction ? "✓" : "×";

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("coin_analysis.signal_reasons.title")}
      </h3>
      {reasons.length > 0 ? (
        <div className="space-y-2">
          {reasons.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${accentColor} bg-gray-800/20`}
            >
              <span className={`text-xs font-bold shrink-0 ${accentColor.split(" ")[0]}`}>
                {bulletIcon}
              </span>
              <span className="text-xs text-gray-300">{r}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t("coin_analysis.signal_reasons.no_reasons")}</p>
      )}
    </div>
  );
}

function TrendAnalysisCard({ analysis }: { readonly analysis: CoinAnalysisState }) {
  const { t } = useI18n();

  const trendMeta = (trend: string): { text: string; bg: string; dot: string; arrow: string } => {
    if (trend.startsWith("Strong Bullish")) return { text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400", arrow: t("coin_analysis.trend_arrow.strong_bullish") };
    if (trend.startsWith("Bullish")) return { text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400", arrow: t("coin_analysis.trend_arrow.bullish") };
    if (trend.startsWith("Strong Bearish")) return { text: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400", arrow: t("coin_analysis.trend_arrow.strong_bearish") };
    if (trend.startsWith("Bearish")) return { text: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400", arrow: t("coin_analysis.trend_arrow.bearish") };
    return { text: "text-gray-400", bg: "bg-gray-500/10", dot: "bg-gray-400", arrow: t("coin_analysis.trend_arrow.sideways") };
  };

  const strengthLabel = (c: number): { label: string; color: string; bg: string } => {
    if (c >= 75) return { label: t("coin_analysis.strength.strong"), color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (c >= 55) return { label: t("coin_analysis.strength.moderate"), color: "text-yellow-400", bg: "bg-yellow-500/10" };
    return { label: t("coin_analysis.strength.weak"), color: "text-gray-400", bg: "bg-gray-500/10" };
  };

  const confidenceBarColor = (c: number): string => {
    if (c >= 75) return "bg-emerald-500";
    if (c >= 55) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("coin_detail.cards.trend_analysis.title")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {analysis.trends.map((tf) => {
          const tm = trendMeta(tf.trend);
          const sl = strengthLabel(tf.confidence);
          const active = tf.isActive;
          return (
            <div
              key={tf.timeframe}
              className={`rounded-lg p-4 transition-all duration-200 border-2 ${
                active
                  ? "bg-gray-800/70 border-emerald-500/60 shadow-[0_0_12px_rgba(52,211,153,0.12)]"
                  : "bg-gray-800/30 border-gray-800/60"
              }`}
            >
              {/* Timeframe label */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  active ? "text-emerald-300" : "text-gray-500"
                }`}>
                  {tf.timeframe.toUpperCase()}
                </span>
                {active && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/70">
                    {t("coin_analysis.active")}
                  </span>
                )}
              </div>

              {/* Trend row: arrow + label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold leading-none">{tm.arrow}</span>
                <span className={`text-sm font-bold ${tm.text}`}>{tf.trend}</span>
              </div>

              {/* Strength badge */}
              <div className="mb-3">
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${sl.bg} ${sl.color}`}>
                  {sl.label}
                </span>
              </div>

              {/* Confidence bar + percentage */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${confidenceBarColor(tf.confidence)}`}
                    style={{ width: `${tf.confidence}%` }}
                  />
                </div>
                <span className={`text-xs font-bold font-mono tabular-nums ${sl.color}`}>
                  {tf.confidence}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
                  const isPositive = r.startsWith("+") || r.startsWith("↑");
                  const isNegative = r.startsWith("-") || r.startsWith("↓");
                  return (
                    <span
                      key={i}
                      className={`text-[10px] leading-tight ${
                        isPositive ? "text-emerald-500" : isNegative ? "text-red-400" : "text-gray-500"
                      }`}
                    >
                      {r}
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



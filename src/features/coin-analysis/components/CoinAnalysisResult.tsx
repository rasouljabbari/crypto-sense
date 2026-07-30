"use client";

import type { SrLine } from "@/components/CandlestickChart";
import { Card } from "@/components/Card";
import { ReasonSummaryCard } from "@/components/ReasonSummaryCard";
import { SetupProgress } from "@/components/SetupProgress";
import { useI18n } from "@/i18n/context";
import { computeStagesFromSnapshot } from "@/lib/setupProgress";
import { useTimeframe } from "@/lib/timeframe";
import type { AnalysisSnapshot } from "@/store/useAnalysisSnapshot";
import { useSnapshotStore } from "@/store/useAnalysisSnapshot";
import dynamic from "next/dynamic";

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
  const snapshot = useSnapshotStore((s) => (coinId ? s.collections[timeframe]?.[coinId] : undefined));

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <div className="h-[300px] bg-gray-900/30 border border-gray-800/50 rounded-xl animate-pulse" />
        <Card loading />
      </div>
    );
  }

  const srLines: SrLine[] = [];
  if (snapshot.srLevels) {
    for (const l of snapshot.srLevels) {
      const p = parseFloat(l.price.replace(/[$,]/g, ""));
      srLines.push({
        price: p,
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
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Reason Summary, Confidence, Setup Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReasonSummaryCard
          recommendation={snapshot.opportunity.recommendation}
          direction={snapshot.tradeSetup.direction ?? null}
          statusLabel={t(
            snapshot.opportunity.recommendation === "ready"
              ? snapshot.tradeSetup.direction === "short"
                ? "setup_progress.final.ready_short"
                : "setup_progress.final.ready_long"
              : snapshot.opportunity.recommendation === "wait"
                ? "setup_progress.final.watch"
                : "setup_progress.final.no_trade",
          )}
          reasons={(snapshot.opportunity.reasons ?? []).map((r) => translateReasonCode(r, t))}
        />
        <ConfidenceBlock snapshot={snapshot} />
        <SetupProgressBlock snapshot={snapshot} />
      </div>

      {/* Row 2: Reasons, Warnings, Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReasonsBlock snapshot={snapshot} />
        <WarningsBlock snapshot={snapshot} />
        <RiskBlock snapshot={snapshot} />
      </div>

      {/* Technical Details */}
      {snapshot.indicators.length > 0 && <TechIndicatorsCard indicators={snapshot.indicators} />}

      {/* Chart */}
      <ChartSection coinId={coinId} srLines={srLines} />
    </div>
  );
}

// ─── Chart ─────────────────────────────────────────────────────────────────

function ChartSection({ coinId, srLines }: { readonly coinId: string; readonly srLines?: SrLine[] }) {
  return (
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl overflow-hidden" style={{ height: 480 }}>
      <CandlestickChart coinId={coinId} srLines={srLines} />
    </div>
  );
}

// ─── Confidence ────────────────────────────────────────────────────────────

function ConfidenceBlock({ snapshot }: { readonly snapshot: AnalysisSnapshot }) {
  const { t } = useI18n();
  const opp = snapshot.opportunity;

  function scoreBarColor(v: number): string {
    if (v >= 65) return "bg-emerald-500";
    if (v >= 40) return "bg-yellow-500";
    return "bg-red-500";
  }

  function scoreTextColor(v: number): string {
    if (v >= 65) return "text-emerald-400";
    if (v >= 40) return "text-yellow-400";
    return "text-red-400";
  }

  const metrics: { label: string; value: number }[] = [
    { label: t("coin_analysis.score.overall"), value: opp.score },
    { label: t("coin_analysis.score.confidence"), value: opp.confidence },
    { label: t("coin_analysis.score.trend"), value: snapshot.strength.trend },
    { label: t("coin_analysis.score.momentum"), value: snapshot.strength.momentum },
    { label: t("coin_analysis.score.volume"), value: snapshot.strength.volume },
  ];

  return (
    <Card title={t("coin_analysis.score.title")}>
      <div className="space-y-2.5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-gray-400">{m.label}</span>
              <span className={`text-[11px] font-bold font-mono tabular-nums ${scoreTextColor(m.value)}`}>
                {m.value}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(m.value)}`}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Setup Progress ────────────────────────────────────────────────────────

function SetupProgressBlock({ snapshot }: { readonly snapshot: AnalysisSnapshot }) {
  const { t } = useI18n();
  const progress = computeStagesFromSnapshot(snapshot);

  return (
    <Card title={t("setup_progress.aria_label")}>
      <SetupProgress
        stages={progress.stages}
        allCompleted={progress.allCompleted}
        hasFailed={progress.hasFailed}
        hasPending={progress.hasPending}
        direction={progress.direction}
        finalStatusKey={progress.finalStatusKey}
        size="sm"
      />
    </Card>
  );
}

// ─── Reasons ───────────────────────────────────────────────────────────────

function ReasonsBlock({ snapshot }: { readonly snapshot: AnalysisSnapshot }) {
  const { t } = useI18n();
  const reasons = (snapshot.opportunity.reasons ?? []).map((r) => translateReasonCode(r, t));

  return (
    <Card title={t("coin_analysis.signal_reasons.title")}>
      {reasons.length > 0 ? (
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
              <span className="text-emerald-400 mt-0.5 shrink-0 leading-none">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{t("coin_analysis.signal_reasons.no_reasons")}</p>
      )}
    </Card>
  );
}

// ─── Warnings ──────────────────────────────────────────────────────────────

function WarningsBlock({ snapshot }: { readonly snapshot: AnalysisSnapshot }) {
  const { t } = useI18n();
  const warnings = (snapshot.opportunity.warnings ?? []).map((w) => translateWarningCode(w, t));

  return (
    <Card title={t("coin_analysis.warnings.title")}>
      {warnings.length > 0 ? (
        <ul className="space-y-1.5">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-yellow-300/80">
              <span className="text-yellow-400 mt-0.5 shrink-0 leading-none">⚠</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">{t("coin_analysis.signal_reasons.no_reasons")}</p>
      )}
    </Card>
  );
}

// ─── Risk ──────────────────────────────────────────────────────────────────

function RiskBlock({ snapshot }: { readonly snapshot: AnalysisSnapshot }) {
  const { t } = useI18n();
  const risk = snapshot.risk;

  const levelColor =
    risk.level === "low"
      ? "text-emerald-400"
      : risk.level === "medium"
        ? "text-yellow-400"
        : "text-red-400";

  const levelBg =
    risk.level === "low"
      ? "bg-emerald-500/10"
      : risk.level === "medium"
        ? "bg-yellow-500/10"
        : "bg-red-500/10";

  const barColor =
    risk.score >= 65
      ? "#ef4444"
      : risk.score >= 40
        ? "#eab308"
        : "#34d399";

  return (
    <Card title={t("coin_analysis.score.risk")}>
      <div className="space-y-3">
        {/* Level badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{t("coin_analysis.explanation.risk_low").replace("Low", "")}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${levelBg} ${levelColor}`}>
            {risk.score} — {risk.level}
          </span>
        </div>

        {/* Score bar */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${risk.score}%`, backgroundColor: barColor }}
          />
        </div>

        {/* Risk reasons */}
        {risk.reasons.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-gray-800/50">
            {risk.reasons.map((r, i) => (
              <p key={i} className="text-[11px] text-gray-500">{r}</p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Technical Details (Indicators) ────────────────────────────────────────

function TechIndicatorsCard({ indicators }: { readonly indicators: readonly AnalysisSnapshot["indicators"][number][] }) {
  const { t } = useI18n();

  const statusStyles: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
    bullish: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", ring: "ring-emerald-500/30" },
    bearish: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", ring: "ring-red-500/30" },
    neutral: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-400", ring: "ring-gray-500/30" },
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-4">
        {t("coin_analysis.indicators.title")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {indicators.map((ind) => {
          const s = statusStyles[ind.status] || statusStyles.neutral;
          const isNumeric = /^[0-9.\-]+$/.test(ind.value);
          return (
            <div
              key={ind.key}
              className="relative bg-gray-800/30 border border-gray-800/50 rounded-lg p-4 transition-colors hover:border-gray-700"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {ind.label}
              </span>
              <div className="flex items-end gap-3 mt-1.5 mb-2">
                {isNumeric && (
                  <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${s.text}`}>
                    {ind.value}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${s.bg} ${s.text} ring-1 ${s.ring}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {translateIndicatorLabel(ind, t)}
                </span>
              </div>
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

// ─── Translation helpers ──────────────────────────────────────────────────

function translateIndicatorLabel(
  ind: AnalysisSnapshot["indicators"][number],
  t: (key: string) => string,
): string {
  const map: Record<string, Record<string, string>> = {
    rsi: {
      Overbought: "coin_analysis.tech_interpret.rsi.overbought",
      Oversold: "coin_analysis.tech_interpret.rsi.oversold",
      Neutral: "coin_analysis.tech_interpret.rsi.neutral",
      Bullish: "coin_analysis.interpretations.rsi_bullish_recovery",
      Bearish: "coin_analysis.interpretations.rsi_bearish_reversal",
    },
    macd: {
      "Bullish Cross": "coin_analysis.tech_interpret.macd.bullish_cross",
      "Bearish Cross": "coin_analysis.tech_interpret.macd.bearish_cross",
      Converging: "coin_analysis.tech_interpret.macd.converging",
      "Bullish Momentum": "coin_analysis.interpretations.macd_momentum_increasing",
      "Bearish Momentum": "coin_analysis.interpretations.macd_momentum_decreasing",
    },
    adx: {
      "Very Strong Trend": "coin_analysis.tech_interpret.adx.very_strong",
      "Strong Trend": "coin_analysis.tech_interpret.adx.strong",
      "Moderate Trend": "coin_analysis.tech_interpret.adx.moderate",
      "Weak Trend": "coin_analysis.tech_interpret.adx.weak",
    },
    ema: {
      "Bullish Alignment": "coin_analysis.tech_interpret.ema.bullish",
      "Bearish Alignment": "coin_analysis.tech_interpret.ema.bearish",
      Mixed: "coin_analysis.tech_interpret.ema.mixed",
      "Short-term Bullish": "coin_analysis.tech_interpret.ema.bullish",
      "Short-term Bearish": "coin_analysis.tech_interpret.ema.bearish",
    },
    atr: {
      "High Volatility": "coin_analysis.tech_interpret.atr.high",
      "Medium Volatility": "coin_analysis.tech_interpret.atr.medium",
      "Low Volatility": "coin_analysis.tech_interpret.atr.low",
    },
    bb: {
      "Above Upper Band": "coin_analysis.tech_interpret.bb.above",
      "Below Lower Band": "coin_analysis.tech_interpret.bb.below",
      "Inside Bands": "coin_analysis.tech_interpret.bb.inside",
    },
  };
  const key = map[ind.key]?.[ind.statusLabel];
  return key ? t(key) : ind.statusLabel;
}

function translateIndicatorInterpretation(
  ind: AnalysisSnapshot["indicators"][number],
  t: (key: string) => string,
): string {
  const map: Record<string, Record<string, string>> = {
    rsi: {
      "Oversold — potential reversal up": "coin_analysis.interpretations.rsi_bullish_recovery",
      "Overbought — potential reversal down": "coin_analysis.interpretations.rsi_bearish_reversal",
      "Neutral zone": "coin_analysis.interpretations.rsi_normal_trading",
    },
    macd: {
      "Bullish Cross": "coin_analysis.tech_interpret.macd.bullish_cross",
      "Bearish Cross": "coin_analysis.tech_interpret.macd.bearish_cross",
      "Bullish Momentum": "coin_analysis.interpretations.macd_momentum_increasing",
      "Bearish Momentum": "coin_analysis.interpretations.macd_momentum_decreasing",
    },
    adx: {
      "Buyers in Control": "coin_analysis.interpretations.adx_buyers_in_control",
      "Trending Market": "coin_analysis.interpretations.adx_trend_developing",
      "Ranging Market": "coin_analysis.interpretations.adx_market_ranging",
    },
    ema: {
      "Bullish Alignment": "coin_analysis.interpretations.ema_uptrend",
      "Short-term Bullish": "coin_analysis.interpretations.ema_uptrend",
      "Bearish Alignment": "coin_analysis.interpretations.ema_downtrend",
      "Short-term Bearish": "coin_analysis.interpretations.ema_downtrend",
      Mixed: "coin_analysis.interpretations.ema_no_clear_trend",
    },
  };
  const key = map[ind.key]?.[ind.interpretation];
  return key ? t(key) : ind.interpretation;
}

/** Translate engine reason code via i18n dictionary. */
function translateReasonCode(
  code: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const colonIdx = code.indexOf(": ");
  const key = colonIdx > 0 ? code.substring(0, colonIdx) : code;
  const detail = colonIdx > 0 ? code.substring(colonIdx + 2) : "";
  if (!key.startsWith("REASON_")) return code;

  const i18nKey = "coin_analysis.reason_codes." + key;
  const vars: Record<string, string | number> = {};
  if (detail) {
    if (detail === "Long" || detail === "Short") {
      vars.direction = detail;
    } else {
      vars.detail = detail;
    }
  }
  const translated = t(i18nKey, vars);
  return translated === i18nKey ? code : translated;
}

/** Translate engine warning code via i18n dictionary. */
function translateWarningCode(
  code: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (!code.startsWith("WARN_")) return code;
  const i18nKey = "coin_analysis.warning_codes." + code;
  const translated = t(i18nKey);
  return translated === i18nKey ? code : translated;
}



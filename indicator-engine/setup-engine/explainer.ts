// ─── Explanation Generator ────────────────────────────────────────────────
// Reads engine result. Produces human-readable explanation.
// NEVER re-analyzes or recalculates. Only consumes pre-built reason/warning codes.
// Uses built-in English map for fallback — all display text should come from i18n.

import type { SetupResult } from "./engine";
import {
  REASON_MARKET_DATA_VALIDATED, REASON_MARKET_CONTEXT_HEALTHY,
  REASON_TREND_STRUCTURE_CONFIRMED, REASON_QUALITY_EXCELLENT,
  REASON_QUALITY_STRONG, REASON_QUALITY_MODERATE, REASON_QUALITY_WEAK,
  REASON_MOMENTUM_EXPANSION, REASON_MOMENTUM_BUILDING,
  REASON_VOLUME_EXPANSION, REASON_VOLUME_AVERAGE,
  REASON_TREND_ALIGNMENT_POSITIVE, REASON_TECHNICAL_STRUCTURE_SOUND,
  REASON_BREAKOUT_TRIGGERED, REASON_BREAKDOWN_TRIGGERED,
  REASON_RISK_REWARD_ACCEPTABLE, REASON_RISK_REWARD_BORDERLINE,
  REASON_HIGH_CONFIDENCE, REASON_MODERATE_CONFIDENCE,
  REASON_TRADE_QUALITY_GOOD, REASON_WATCH_SETUP_FORMING,
  REASON_NOT_TRADEABLE, REASON_TREND_NOT_CONFIRMED, REASON_PIPELINE_STOPPED,
  WARN_CLOSE_TO_RESISTANCE, WARN_APPROACHING_RESISTANCE,
  WARN_CLOSE_TO_SUPPORT, WARN_APPROACHING_SUPPORT,
  WARN_RSI_OVERBOUGHT, WARN_RSI_OVERSOLD, WARN_RISK_HIGH,
  WARN_VOLUME_BELOW_AVERAGE, WARN_SCORE_BELOW_THRESHOLD, WARN_LOW_CONFIDENCE,
} from "./reason-builder";

// ─── English Fallback Maps ──────────────────────────────────────────────────
// These are the display defaults. i18n overrides them in the UI layer.

const REASON_ENGLISH_MAP: Record<string, string> = {
  [REASON_MARKET_DATA_VALIDATED]:     "✓ Market data validated",
  [REASON_MARKET_CONTEXT_HEALTHY]:    "✓ Market Context is Healthy",
  [REASON_TREND_STRUCTURE_CONFIRMED]: "✓ Trend Structure Confirmed",
  [REASON_QUALITY_EXCELLENT]:         "✓ Setup quality is excellent",
  [REASON_QUALITY_STRONG]:            "✓ Setup quality is strong",
  [REASON_QUALITY_MODERATE]:          "○ Setup quality is moderate",
  [REASON_QUALITY_WEAK]:              "○ Setup quality is weak — monitoring",
  [REASON_MOMENTUM_EXPANSION]:        "✓ Momentum Expansion Detected",
  [REASON_MOMENTUM_BUILDING]:         "○ Momentum building",
  [REASON_VOLUME_EXPANSION]:          "✓ Volume Expansion Confirmed",
  [REASON_VOLUME_AVERAGE]:            "○ Volume at average levels",
  [REASON_TREND_ALIGNMENT_POSITIVE]:  "✓ Trend alignment positive",
  [REASON_TECHNICAL_STRUCTURE_SOUND]: "✓ Technical structure sound",
  [REASON_BREAKOUT_TRIGGERED]:        "✓ Breakout Trigger Activated",
  [REASON_BREAKDOWN_TRIGGERED]:       "✓ Breakdown Trigger Activated",
  [REASON_RISK_REWARD_ACCEPTABLE]:    "✓ Risk / Reward Acceptable",
  [REASON_RISK_REWARD_BORDERLINE]:    "○ Risk / Reward borderline",
  [REASON_HIGH_CONFIDENCE]:           "✓ High confidence setup",
  [REASON_MODERATE_CONFIDENCE]:       "○ Moderate confidence",
  [REASON_TRADE_QUALITY_GOOD]:        "✓ Trade quality above threshold",
  [REASON_WATCH_SETUP_FORMING]:       "○ {direction} setup forming — monitoring",
  [REASON_NOT_TRADEABLE]:             "✗ Market Context not tradeable: {detail}",
  [REASON_TREND_NOT_CONFIRMED]:       "✗ Trend Structure not confirmed: {detail}",
  [REASON_PIPELINE_STOPPED]:          "✗ {detail}",
};

const WARN_ENGLISH_MAP: Record<string, string> = {
  [WARN_CLOSE_TO_RESISTANCE]:    "• Close to Resistance — breakout risk",
  [WARN_APPROACHING_RESISTANCE]: "• Approaching Resistance",
  [WARN_CLOSE_TO_SUPPORT]:       "• Close to Support — breakdown risk",
  [WARN_APPROACHING_SUPPORT]:    "• Approaching Support",
  [WARN_RSI_OVERBOUGHT]:        "• RSI overbought — potential reversal",
  [WARN_RSI_OVERSOLD]:          "• RSI oversold — potential reversal",
  [WARN_RISK_HIGH]:             "• Risk level is high",
  [WARN_VOLUME_BELOW_AVERAGE]:   "• Volume below average — low participation",
  [WARN_SCORE_BELOW_THRESHOLD]: "• Overall score below threshold",
  [WARN_LOW_CONFIDENCE]:        "• Low confidence — additional confirmation needed",
};

/** Convert a single reason code (possibly with `: detail` suffix) to English. */
function codeToEnglish(code: string, map: Record<string, string>): string {
  const colonIdx = code.indexOf(": ");
  const key = colonIdx > 0 ? code.substring(0, colonIdx) : code;
  const detail = colonIdx > 0 ? code.substring(colonIdx + 2) : "";
  const template = map[key] ?? code;
  if (detail) {
    return template.replace("{detail}", detail);
  }
  return template;
}

// ─── Public ─────────────────────────────────────────────────────────────────

export interface Explanation {
  /** One-line summary of the final decision. */
  summary: string;
  /** Pre-built structured reason codes from the engine. */
  reasons: string[];
  /** Pre-built warning codes from the engine. */
  warnings: string[];
  /** Full readable paragraph in English (fallback). */
  detail: string;
}

export function generateExplanation(result: SetupResult): Explanation {
  const reasonCodes = result.reasons ?? [];
  const warningCodes = result.warnings ?? [];

  // Convert codes → English display strings
  const reasons = reasonCodes.map((c) => codeToEnglish(c, REASON_ENGLISH_MAP));
  const warnings = warningCodes.map((c) => codeToEnglish(c, WARN_ENGLISH_MAP));

  return finalize(result.finalStatus, reasons, warnings);
}

function finalize(status: string, reasons: string[], warnings: string[]): Explanation {
  const statusMap: Record<string, string> = {
    NO_TRADE: "No Trade",
    WATCH: "Watch",
    READY_LONG: "Ready Long",
    READY_SHORT: "Ready Short",
  };
  const summary = statusMap[status] ?? status;
  const displayReasons = [...reasons];
  const displayWarnings = [...warnings];
  const parts = [summary, ...displayReasons];
  if (displayWarnings.length > 0) {
    parts.push("Warnings: " + displayWarnings.join("; "));
  }
  const detail = parts.join(". ") + ".";
  return { summary, reasons: displayReasons, warnings: displayWarnings, detail };
}

// ─── Reason Builder ───────────────────────────────────────────────────────────
// Reusable builders for explainable setup results.
// Single source of truth for all explanation logic.
// Returns reason/warning CODES — no hardcoded display strings.
// All display text lives in i18n dictionaries.
//
// Consumers:
//   - UI: translates codes via t("reason.<CODE>") / t("warn.<CODE>")
//   - explainer.ts: English fallback map for internal use

import type {
  SetupInput, MarketDataStatus, Tradeability, MarketDirection,
  SetupQuality, Position, Signal, TrendLabel, RiskLevel,
} from "./engine";

// ─── Analysis Version ────────────────────────────────────────────────────────

export const ANALYSIS_VERSION = "2.1.0-explainable";

// ─── Reason Codes ────────────────────────────────────────────────────────────
// Every code follows REASON_<GROUP>_<MEANING> convention.
// i18n keys: "reason.<CODE>" for reasons, "warn.<CODE>" for warnings.

// Stage 0 — Market Data
export const REASON_MARKET_DATA_VALIDATED      = "REASON_MARKET_DATA_VALIDATED";

// Stage 1 — Tradeability
export const REASON_MARKET_CONTEXT_HEALTHY     = "REASON_MARKET_CONTEXT_HEALTHY";
export const REASON_NOT_TRADEABLE              = "REASON_NOT_TRADEABLE";

// Stage 2 — Direction
export const REASON_TREND_STRUCTURE_CONFIRMED  = "REASON_TREND_STRUCTURE_CONFIRMED";
export const REASON_TREND_NOT_CONFIRMED        = "REASON_TREND_NOT_CONFIRMED";

// Stage 3 — Setup Quality
export const REASON_QUALITY_EXCELLENT          = "REASON_QUALITY_EXCELLENT";
export const REASON_QUALITY_STRONG             = "REASON_QUALITY_STRONG";
export const REASON_QUALITY_MODERATE           = "REASON_QUALITY_MODERATE";
export const REASON_QUALITY_WEAK               = "REASON_QUALITY_WEAK";

// Stage 4 — Momentum
export const REASON_MOMENTUM_EXPANSION         = "REASON_MOMENTUM_EXPANSION";
export const REASON_MOMENTUM_BUILDING          = "REASON_MOMENTUM_BUILDING";

// Volume
export const REASON_VOLUME_EXPANSION           = "REASON_VOLUME_EXPANSION";
export const REASON_VOLUME_AVERAGE             = "REASON_VOLUME_AVERAGE";

// Trend & Technical
export const REASON_TREND_ALIGNMENT_POSITIVE   = "REASON_TREND_ALIGNMENT_POSITIVE";
export const REASON_TECHNICAL_STRUCTURE_SOUND  = "REASON_TECHNICAL_STRUCTURE_SOUND";

// Signal trigger
export const REASON_BREAKOUT_TRIGGERED         = "REASON_BREAKOUT_TRIGGERED";
export const REASON_BREAKDOWN_TRIGGERED        = "REASON_BREAKDOWN_TRIGGERED";

// Risk / Reward
export const REASON_RISK_REWARD_ACCEPTABLE     = "REASON_RISK_REWARD_ACCEPTABLE";
export const REASON_RISK_REWARD_BORDERLINE     = "REASON_RISK_REWARD_BORDERLINE";

// Confidence & Quality
export const REASON_HIGH_CONFIDENCE            = "REASON_HIGH_CONFIDENCE";
export const REASON_MODERATE_CONFIDENCE        = "REASON_MODERATE_CONFIDENCE";
export const REASON_TRADE_QUALITY_GOOD         = "REASON_TRADE_QUALITY_GOOD";

// State-specific
export const REASON_WATCH_SETUP_FORMING        = "REASON_WATCH_SETUP_FORMING";
export const REASON_PIPELINE_STOPPED           = "REASON_PIPELINE_STOPPED";

// ─── Warning Codes ───────────────────────────────────────────────────────────

export const WARN_CLOSE_TO_RESISTANCE          = "WARN_CLOSE_TO_RESISTANCE";
export const WARN_APPROACHING_RESISTANCE       = "WARN_APPROACHING_RESISTANCE";
export const WARN_CLOSE_TO_SUPPORT             = "WARN_CLOSE_TO_SUPPORT";
export const WARN_APPROACHING_SUPPORT          = "WARN_APPROACHING_SUPPORT";
export const WARN_RSI_OVERBOUGHT               = "WARN_RSI_OVERBOUGHT";
export const WARN_RSI_OVERSOLD                 = "WARN_RSI_OVERSOLD";
export const WARN_RISK_HIGH                    = "WARN_RISK_HIGH";
export const WARN_VOLUME_BELOW_AVERAGE          = "WARN_VOLUME_BELOW_AVERAGE";
export const WARN_SCORE_BELOW_THRESHOLD        = "WARN_SCORE_BELOW_THRESHOLD";
export const WARN_LOW_CONFIDENCE               = "WARN_LOW_CONFIDENCE";

// ─── Public Interface ────────────────────────────────────────────────────────

export interface ReasonBuilderParams {
  readonly marketDataStatus: MarketDataStatus;
  readonly tradeable: Tradeability;
  readonly marketDirection: MarketDirection;
  readonly setupQuality: SetupQuality;
  readonly overallScore: number;
  readonly volumeScore: number;
  readonly trendScore: number;
  readonly technicalScore: number;
  readonly momentumScore: number;
  readonly position: Position;
  readonly signal: Signal;
  readonly trendLabel: TrendLabel;
  readonly riskLevel: RiskLevel;
  readonly confidence: number;
  readonly tradeQuality: number;
  readonly riskRewardString: string | null;
  readonly input: Pick<SetupInput, "currentPrice" | "rsi" | "resistanceLevels" | "supportLevels">;
  readonly finalStatus: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBuySignal(s: Signal): boolean {
  return s === "buy" || s === "strong_buy";
}
function isSellSignal(s: Signal): boolean {
  return s === "sell" || s === "strong_sell";
}

function rrRatio(rrString: string | null): number {
  if (!rrString) return 0;
  const m = rrString.match(/^1:(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

// ─── Reason Builder ───────────────────────────────────────────────────────────
// Returns array of reason CODE strings (no display text).
// Each code maps to an i18n key: "reason.<CODE>"
// Dynamic reasons append detail after colon: "REASON_NOT_TRADEABLE: Liquidity too low"
// UI parses colon to separate code + interpolation args.

export function buildSetupReasons(params: ReasonBuilderParams): string[] {
  const reasons: string[] = [];

  if (params.marketDataStatus === "VALID") {
    reasons.push(REASON_MARKET_DATA_VALIDATED);
  }

  if (params.tradeable === "YES") {
    reasons.push(REASON_MARKET_CONTEXT_HEALTHY);
  }

  if (params.marketDirection !== "unknown") {
    reasons.push(REASON_TREND_STRUCTURE_CONFIRMED);
  }

  if (params.setupQuality === "EXCELLENT") {
    reasons.push(REASON_QUALITY_EXCELLENT);
  } else if (params.setupQuality === "STRONG") {
    reasons.push(REASON_QUALITY_STRONG);
  } else if (params.setupQuality === "NORMAL") {
    reasons.push(REASON_QUALITY_MODERATE);
  }

  if (params.momentumScore >= 75) {
    reasons.push(REASON_MOMENTUM_EXPANSION);
  } else if (params.momentumScore >= 55) {
    reasons.push(REASON_MOMENTUM_BUILDING);
  }

  if (params.volumeScore >= 70) {
    reasons.push(REASON_VOLUME_EXPANSION);
  } else if (params.volumeScore >= 50) {
    reasons.push(REASON_VOLUME_AVERAGE);
  }

  if (params.trendScore >= 70) {
    reasons.push(REASON_TREND_ALIGNMENT_POSITIVE);
  }

  if (params.technicalScore >= 70) {
    reasons.push(REASON_TECHNICAL_STRUCTURE_SOUND);
  }

  if (params.position === "long" && isBuySignal(params.signal)) {
    reasons.push(REASON_BREAKOUT_TRIGGERED);
  } else if (params.position === "short" && isSellSignal(params.signal)) {
    reasons.push(REASON_BREAKDOWN_TRIGGERED);
  }

  const rr = rrRatio(params.riskRewardString);
  if (rr >= 2) {
    reasons.push(REASON_RISK_REWARD_ACCEPTABLE);
  } else if (rr >= 1) {
    reasons.push(REASON_RISK_REWARD_BORDERLINE);
  }

  if (params.confidence >= 80) {
    reasons.push(REASON_HIGH_CONFIDENCE);
  } else if (params.confidence >= 60) {
    reasons.push(REASON_MODERATE_CONFIDENCE);
  }

  if (params.tradeQuality >= 70) {
    reasons.push(REASON_TRADE_QUALITY_GOOD);
  }

  if (params.finalStatus === "WATCH") {
    const dir = params.marketDirection === "long" ? "Long" : "Short";
    reasons.push(REASON_WATCH_SETUP_FORMING + ": " + dir);
  }

  return reasons;
}

// ─── Warning Builder ──────────────────────────────────────────────────────────
// Returns array of warning CODE strings (no display text).
// Each maps to i18n key: "warn.<CODE>"

export function buildSetupWarnings(params: ReasonBuilderParams): string[] {
  const warnings: string[] = [];

  if (params.marketDirection === "long") {
    const resLevels = params.input.resistanceLevels;
    if (resLevels.length > 0) {
      const nearest = Math.min(...resLevels);
      const distPct = Math.abs(nearest - params.input.currentPrice) / params.input.currentPrice * 100;
      if (distPct <= 0.5) {
        warnings.push(WARN_CLOSE_TO_RESISTANCE);
      } else if (distPct <= 1.5) {
        warnings.push(WARN_APPROACHING_RESISTANCE);
      }
    }
  }

  if (params.marketDirection === "short") {
    const supLevels = params.input.supportLevels;
    if (supLevels.length > 0) {
      const nearest = Math.max(...supLevels);
      const distPct = Math.abs(params.input.currentPrice - nearest) / params.input.currentPrice * 100;
      if (distPct <= 0.5) {
        warnings.push(WARN_CLOSE_TO_SUPPORT);
      } else if (distPct <= 1.5) {
        warnings.push(WARN_APPROACHING_SUPPORT);
      }
    }
  }

  if (params.input.rsi >= 75) {
    warnings.push(WARN_RSI_OVERBOUGHT);
  } else if (params.input.rsi <= 25) {
    warnings.push(WARN_RSI_OVERSOLD);
  }

  if (params.riskLevel === "high") {
    warnings.push(WARN_RISK_HIGH);
  }

  if (params.volumeScore < 40) {
    warnings.push(WARN_VOLUME_BELOW_AVERAGE);
  }

  if (params.overallScore < 50) {
    warnings.push(WARN_SCORE_BELOW_THRESHOLD);
  }

  if (params.confidence < 40) {
    warnings.push(WARN_LOW_CONFIDENCE);
  }

  return warnings;
}

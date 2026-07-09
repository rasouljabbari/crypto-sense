// ---------------------------------------------------------------------------
// Trading Signal Engine
//
// Derives a 5-level trading signal (Strong Buy → Strong Sell) exclusively
// from the Score Engine output. No external data, no AI, no randomness.
//
// Signal thresholds are configurable via constants. All formulas are
// documented inline and 100% deterministic.
// ---------------------------------------------------------------------------

import type { ScoreEngineOutput } from "../scoring";

import type {
  TradingSignalType,
  TradingSignalOutput,
  SignalContribution,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const SIGNAL_THRESHOLDS = {
  STRONG_BUY: 75,
  BUY: 55,
  NEUTRAL_HIGH: 55,
  NEUTRAL_LOW: 45,
  SELL: 25,
  STRONG_SELL: 0,
} as const;

const CONFIDENCE_WEIGHTS = {
  ENGINE_CONFIDENCE: 0.50,
  SIGNAL_STRENGTH: 0.30,
  COMPONENT_AGREEMENT: 0.20,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────

function clamp(value: number, min: number = 0, max: number = 100): number {
  if (!Number.isFinite(value)) return 50;
  return Math.round(Math.max(min, Math.min(max, value)));
}

function factor(
  name: string,
  weight: number,
  raw: number,
): SignalContribution {
  return { name, weight, raw, contribution: Math.round(raw * weight) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Signal Determination
// ═══════════════════════════════════════════════════════════════════════════
//
// Base signal is determined by the overall score:
//
//   overall >= 75  →  strong_buy   (decisive bullish)
//   overall >= 55  →  buy           (leaning bullish)
//   overall 45-54  →  neutral       (no clear direction)
//   overall >= 25  →  sell          (leaning bearish)
//   overall < 25   →  strong_sell   (decisive bearish)
//
// The base signal is then modified by:
//   1. Risk cap: if risk < 30, strong_buy → buy, strong_sell → sell
//   2. Component divergence penalty: if components disagree, signal
//      is downgraded one notch toward neutral

function baseSignal(overall: number): TradingSignalType {
  if (overall >= SIGNAL_THRESHOLDS.STRONG_BUY) return "strong_buy";
  if (overall >= SIGNAL_THRESHOLDS.BUY) return "buy";
  if (overall >= SIGNAL_THRESHOLDS.NEUTRAL_LOW) return "neutral";
  if (overall >= SIGNAL_THRESHOLDS.SELL) return "sell";
  return "strong_sell";
}

const SIGNAL_RANK: Record<TradingSignalType, number> = {
  strong_buy: 4,
  buy: 3,
  neutral: 2,
  sell: 1,
  strong_sell: 0,
};

const SIGNAL_FROM_RANK: Record<number, TradingSignalType> = {
  4: "strong_buy",
  3: "buy",
  2: "neutral",
  1: "sell",
  0: "strong_sell",
};

function applyRiskCap(
  signal: TradingSignalType,
  riskScore: number,
): TradingSignalType {
  if (riskScore >= 30) return signal;

  const rank = SIGNAL_RANK[signal];

  // High risk environment: cap extreme signals
  if (riskScore < 20) {
    // strong_buy → buy, strong_sell → sell
    if (rank === 4) return "buy";
    if (rank === 0) return "sell";
    return signal;
  }

  // risk 20-29: cap strong extremes only
  if (rank === 4 && riskScore < 20) return "buy";
  if (rank === 0 && riskScore < 20) return "sell";

  return signal;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component Divergence
// ═══════════════════════════════════════════════════════════════════════════
//
// Measures how much the 6 component scores (technical, trend, momentum,
// volume, sentiment, risk) disagree with each other.
//
// Disagreement = average absolute difference from the mean, normalized to 0-1.
// If disagreement > 0.25, components are diverging → weaken signal.
//
// Divergence penalty:
//   disagreement > 0.25 → downgrade signal one notch toward neutral
//   disagreement > 0.40 → downgrade two notches toward neutral
// ═══════════════════════════════════════════════════════════════════════════

function componentDisagreement(output: ScoreEngineOutput): number {
  const components = [
    output.technical,
    output.trend,
    output.momentum,
    output.volume,
    output.sentiment,
    output.risk,
  ];

  const mean = components.reduce((a, b) => a + b, 0) / components.length;
  const avgDev =
    components.reduce((sum, c) => sum + Math.abs(c - mean), 0) / components.length;

  // Normalize to 0-1: max possible avgDev from mean is 50
  return clamp(avgDev / 50, 0, 1);
}

function applyDivergencePenalty(
  signal: TradingSignalType,
  disagreement: number,
): TradingSignalType {
  if (disagreement <= 0.25) return signal;

  const rank = SIGNAL_RANK[signal];
  let penalty = 0;

  if (disagreement > 0.40) penalty = 2;
  else penalty = 1;

  // Apply penalty toward neutral (rank 2)
  const target = rank > 2
    ? Math.max(2, rank - penalty)
    : rank < 2
      ? Math.min(2, rank + penalty)
      : rank;

  return SIGNAL_FROM_RANK[target];
}

// ═══════════════════════════════════════════════════════════════════════════
// Signal Confidence
// ═══════════════════════════════════════════════════════════════════════════
//
// Final confidence combines three factors:
//
//   1. Score Engine confidence (50% weight)
//      Represents data quality and score agreement from the engine.
//
//   2. Signal strength (30% weight)
//      How far the overall score is from neutral:
//        strength = |overall - 50| / 50 × 100
//      A strong signal (near 0 or 100) has high conviction.
//      A weak signal (near 50) has low conviction.
//
//   3. Component agreement (20% weight)
//      Inverse of disagreement:
//        agreement = (1 - disagreement) × 100
//      When all components point the same direction, confidence is high.
// ═══════════════════════════════════════════════════════════════════════════

function calcSignalConfidence(
  engineConfidence: number,
  overall: number,
  disagreement: number,
): { value: number; factors: SignalContribution[] } {
  // Factor 1: Score Engine confidence
  const engConf = factor(
    "Engine_Confidence",
    CONFIDENCE_WEIGHTS.ENGINE_CONFIDENCE,
    engineConfidence,
  );

  // Factor 2: Signal strength
  const strengthRaw = (Math.abs(overall - 50) / 50) * 100;
  const strFactor = factor(
    "Signal_Strength",
    CONFIDENCE_WEIGHTS.SIGNAL_STRENGTH,
    strengthRaw,
  );

  // Factor 3: Component agreement (inverse of disagreement)
  const agreementRaw = (1 - disagreement) * 100;
  const agrFactor = factor(
    "Component_Agreement",
    CONFIDENCE_WEIGHTS.COMPONENT_AGREEMENT,
    agreementRaw,
  );

  const value = clamp(
    engConf.contribution + strFactor.contribution + agrFactor.contribution,
  );

  return { value, factors: [engConf, strFactor, agrFactor] };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export function generateTradingSignal(
  input: ScoreEngineOutput,
): TradingSignalOutput {
  const { overall, risk, confidence } = input;

  // 1. Base signal from overall score
  let signal = baseSignal(overall);

  // 2. Apply risk cap (high risk moderates extreme signals)
  signal = applyRiskCap(signal, risk);

  // 3. Measure component divergence
  const disagreement = componentDisagreement(input);

  // 4. Apply divergence penalty
  signal = applyDivergencePenalty(signal, disagreement);

  // 5. Compute signal confidence
  const sigConf = calcSignalConfidence(confidence, overall, disagreement);

  return {
    signal,
    score: overall,
    confidence: sigConf.value,
    factors: sigConf.factors,
  };
}

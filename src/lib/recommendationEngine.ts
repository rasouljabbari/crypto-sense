import { CoinAnalysis, SignalType, Recommendation, ReasonCode } from "./types";

export interface RecommendationResult {
  recommendation: Recommendation;
  reasonCode: ReasonCode;
  reason: string;
  color: string;
  priority: number;
}

// ── helpers ────────────────────────────────────────────────

function isSellSignal(s: SignalType): boolean {
  return s === "sell" || s === "strong_sell";
}
function isBuySignal(s: SignalType): boolean {
  return s === "buy" || s === "strong_buy";
}

function getNearestBelow(levels: number[], price: number): number | null {
  const below = levels.filter((l) => l < price);
  if (below.length === 0) return null;
  return Math.max(...below);
}

function getNearestAbove(levels: number[], price: number): number | null {
  const above = levels.filter((l) => l > price);
  if (above.length === 0) return null;
  return Math.min(...above);
}

function computeEntrySLTP(
  signal: SignalType,
  price: number,
  supportLevels: number[],
  resistanceLevels: number[],
): { entry: number | null; stopLoss: number | null; takeProfit: number | null } {
  if (isBuySignal(signal)) {
    const entry = getNearestBelow(supportLevels, price) ?? price * 0.98;
    const stopLoss = getNearestBelow(supportLevels.filter((l) => l < entry), price) ?? entry * 0.97;
    const takeProfit = getNearestAbove(resistanceLevels, price) ?? price * 1.05;
    return { entry, stopLoss, takeProfit };
  }
  if (isSellSignal(signal)) {
    const entry = getNearestAbove(resistanceLevels, price) ?? price * 1.02;
    const stopLoss = getNearestAbove(resistanceLevels.filter((l) => l > entry), price) ?? entry * 1.03;
    const takeProfit = getNearestBelow(supportLevels, price) ?? price * 0.95;
    return { entry, stopLoss, takeProfit };
  }
  return { entry: null, stopLoss: null, takeProfit: null };
}

function computeRR(entry: number, stopLoss: number, takeProfit: number): number {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (risk === 0) return 0;
  return reward / risk;
}

function formatRR(ratio: number): string {
  if (ratio >= 3) return "1:3";
  if (ratio >= 2.5) return "1:2.5";
  if (ratio >= 2) return "1:2";
  return `1:${ratio.toFixed(1)}`;
}

// Translate riskReward string ("1:2", "1:1.5", null) to numeric threshold check
function rrAtLeast(minRR: number, rr: string | null): boolean {
  if (!rr) return false;
  const m = rr.match(/^1:(\d+(?:\.\d+)?)/);
  if (!m) return false;
  return parseFloat(m[1]) >= minRR;
}

// ── DECISION MATRIX ────────────────────────────────────────
// Signal is single source of truth.
// Opportunity is the final output, determined by strict rules.

export function generateRecommendation(coin: CoinAnalysis): RecommendationResult {
  const {
    overallScore,
    signal,
    confidence,
    tradeQuality,
    riskLevel,
    riskReward,
  } = coin;

  // ── SELL / STRONG SELL → always Skip ──────────────────────
  if (isSellSignal(signal)) {
    return {
      recommendation: "skip",
      reasonCode: "SKIP_WEAK_TREND",
      reason: signal === "strong_sell"
        ? "Strong sell signal — avoid any long entry."
        : "Sell signal — no valid trade setup.",
      color: "#ef4444",
      priority: 0,
    };
  }

  // ── NEUTRAL → Wait if promising, else Skip ─────────────────
  if (signal === "neutral") {
    if (overallScore >= 50) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_CONFIRMATION",
        reason: `Neutral signal, score ${overallScore} — monitoring for direction.`,
        color: "#eab308",
        priority: 30,
      };
    }
    return {
      recommendation: "skip",
      reasonCode: "SKIP_WEAK_TREND",
      reason: `Neutral signal, weak score ${overallScore} — no trade.`,
      color: "#ef4444",
      priority: 10,
    };
  }

  // ── BUY ────────────────────────────────────────────────────
  // Ready only if: trade validation passed, risk≠high, conf≥70, quality≥70, R:R≥1:1.5
  if (signal === "buy") {
    const riskOk = riskLevel !== "high";
    const qualityOk = tradeQuality >= 70;
    const confOk = confidence >= 70;
    const rrOk = rrAtLeast(1.5, riskReward);

    if (riskOk && qualityOk && confOk && rrOk) {
      return {
        recommendation: "ready",
        reasonCode: "READY",
        reason: `Buy signal confirmed. Score ${overallScore} | Confidence ${confidence}% | Quality ${tradeQuality} | R:R ${riskReward ?? "?"}`,
        color: "#22c55e",
        priority: 100,
      };
    }

    // Determine specific wait reason
    if (!riskOk) {
      return {
        recommendation: "wait",
        reasonCode: "SKIP_HIGH_RISK",
        reason: "Buy signal but risk is high — waiting for improvement.",
        color: "#eab308",
        priority: 41,
      };
    }
    if (!rrOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_CONFIRMATION",
        reason: `Buy signal but R:R insufficient (${riskReward ?? "none"}) — waiting for better entry.`,
        color: "#eab308",
        priority: 42,
      };
    }
    if (!qualityOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_CONFIRMATION",
        reason: `Buy signal but quality ${tradeQuality} below 70 — needs improvement.`,
        color: "#eab308",
        priority: 43,
      };
    }
    if (!confOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_VOLUME",
        reason: `Buy signal but confidence ${confidence}% below 70 — volume confirmation needed.`,
        color: "#eab308",
        priority: 44,
      };
    }

    return {
      recommendation: "wait",
      reasonCode: "WAIT_CONFIRMATION",
      reason: "Buy signal — final checks pending.",
      color: "#eab308",
      priority: 45,
    };
  }

  // ── STRONG BUY ─────────────────────────────────────────────
  // Ready only if: trade validation passed, conf≥80, quality≥80, risk low/med, R:R≥1:2
  if (signal === "strong_buy") {
    const riskOk = riskLevel !== "high";
    const qualityOk = tradeQuality >= 80;
    const confOk = confidence >= 80;
    const rrOk = rrAtLeast(2, riskReward);

    if (riskOk && qualityOk && confOk && rrOk) {
      return {
        recommendation: "ready",
        reasonCode: "READY",
        reason: `Strong buy signal confirmed. Score ${overallScore} | Confidence ${confidence}% | Quality ${tradeQuality} | R:R ${riskReward ?? "?"}`,
        color: "#22c55e",
        priority: 100,
      };
    }

    if (!riskOk) {
      return {
        recommendation: "wait",
        reasonCode: "SKIP_HIGH_RISK",
        reason: "Strong buy but risk is high — waiting for improvement.",
        color: "#eab308",
        priority: 51,
      };
    }
    if (!rrOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_CONFIRMATION",
        reason: `Strong buy but R:R insufficient (${riskReward ?? "none"}) — waiting for better entry.`,
        color: "#eab308",
        priority: 52,
      };
    }
    if (!qualityOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_CONFIRMATION",
        reason: `Strong buy but quality ${tradeQuality} below 80 — needs improvement.`,
        color: "#eab308",
        priority: 53,
      };
    }
    if (!confOk) {
      return {
        recommendation: "wait",
        reasonCode: "WAIT_VOLUME",
        reason: `Strong buy but confidence ${confidence}% below 80 — volume confirmation needed.`,
        color: "#eab308",
        priority: 54,
      };
    }

    return {
      recommendation: "wait",
      reasonCode: "WAIT_CONFIRMATION",
      reason: "Strong buy signal — final checks pending.",
      color: "#eab308",
      priority: 55,
    };
  }

  // Fallback (should never reach here)
  return {
    recommendation: "skip",
    reasonCode: "SKIP_INVALID_SETUP",
    reason: "Unhandled signal state — manual review advised.",
    color: "#ef4444",
    priority: 0,
  };
}

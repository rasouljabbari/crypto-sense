// ─── Explanation Generator ────────────────────────────────────────────────
// Reads engine result. Produces human-readable explanation.
// NEVER re-analyzes or recalculates. Only explains existing decision.

import type { SetupResult } from "./engine";

export interface Explanation {
  /** One-line summary of the final decision. */
  summary: string;
  /** Bullet-point reasons why the engine reached this decision. */
  reasons: string[];
  /** Full readable paragraph. */
  detail: string;
}

export function generateExplanation(result: SetupResult): Explanation {
  const reasons: string[] = [];

  // ─── Stage 0: Market Data ──────────────────────────────────────────
  if (result.marketDataStatus === "VALID") {
    reasons.push("Market data valid");
  } else if (result.marketDataReason) {
    reasons.push(`Market data unavailable: ${result.marketDataReason}`);
    return finalize(result.finalStatus, reasons);
  }

  // ─── Stage 1: Tradeability ─────────────────────────────────────────
  if (result.tradeable === "NO") {
    const r = result.tradeabilityReason ?? "Market not tradeable";
    reasons.push(`Not tradeable: ${r}`);
    return finalize(result.finalStatus, reasons);
  }
  reasons.push("Tradeable market");

  // ─── Stage 2: Direction ────────────────────────────────────────────
  if (result.marketDirection === "unknown") {
    reasons.push("Direction cannot be determined");
    return finalize(result.finalStatus, reasons);
  }
  if (result.marketDirectionReason) {
    reasons.push(result.marketDirectionReason);
  } else {
    reasons.push(`Direction: ${result.marketDirection.toUpperCase()}`);
  }

  // ─── Stage 3: Quality ──────────────────────────────────────────────
  if (result.setupQualityReason) {
    // Decompose the semicolon-joined Stage 3 quality details
    const qualityParts = result.setupQualityReason.split("; ").filter(Boolean);
    for (const part of qualityParts) {
      reasons.push(part);
    }
  }
  reasons.push(`Setup quality: ${result.setupQuality}`);

  // ─── Stage 4: Status context ───────────────────────────────────────
  if (result.finalStatus === "WATCH") {
    const dir = result.marketDirection === "long" ? "Long" : "Short";
    reasons.push(`${dir} setup forming — monitoring for confirmation`);
  }
  if (result.finalStatus === "READY_LONG" || result.finalStatus === "READY_SHORT") {
    const dir = result.finalStatus === "READY_LONG" ? "Long" : "Short";
    if (result.tradeSetup.hasTrade) {
      reasons.push(`Entry at ${formatPrice(result.tradeSetup.entry)}`);
      reasons.push(`Stop loss at ${formatPrice(result.tradeSetup.stopLoss)}`);
    }
    reasons.push(`${dir} setup ready for execution`);
  }

  return finalize(result.finalStatus, reasons);
}

function finalize(status: string, reasons: string[]): Explanation {
  const statusMap: Record<string, string> = {
    NO_TRADE: "No Trade",
    WATCH: "Watch",
    READY_LONG: "Ready Long",
    READY_SHORT: "Ready Short",
  };
  const summary = statusMap[status] ?? status;
  const detail = `${summary}. ${reasons.join(". ")}.`;
  return { summary, reasons, detail };
}

function formatPrice(v: number): string {
  if (v >= 1000) return v.toFixed(2);
  if (v >= 1) return v.toFixed(4);
  return v.toFixed(6);
}

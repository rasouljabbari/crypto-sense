// ─── Setup Progress — stage detection from engine output ─────────────────
// Derives visual stage states from the engine's reason/warning codes.
// Consumed by SetupProgress component. No UI logic here.

import type { AnalysisSnapshot } from "@/store/useAnalysisSnapshot";

// ─── Re-export reason/warning codes used for detection ────────────────────

export const STAGE_CODES = {
  MARKET_CONTEXT_HEALTHY: "REASON_MARKET_CONTEXT_HEALTHY",
  MARKET_DATA_VALIDATED: "REASON_MARKET_DATA_VALIDATED",
  NOT_TRADEABLE: "REASON_NOT_TRADEABLE",
  PIPELINE_STOPPED: "REASON_PIPELINE_STOPPED",
  TREND_CONFIRMED: "REASON_TREND_STRUCTURE_CONFIRMED",
  TREND_NOT_CONFIRMED: "REASON_TREND_NOT_CONFIRMED",
  MOMENTUM_EXPANSION: "REASON_MOMENTUM_EXPANSION",
  MOMENTUM_BUILDING: "REASON_MOMENTUM_BUILDING",
  VOLUME_EXPANSION: "REASON_VOLUME_EXPANSION",
  VOLUME_AVERAGE: "REASON_VOLUME_AVERAGE",
  BREAKOUT: "REASON_BREAKOUT_TRIGGERED",
  BREAKDOWN: "REASON_BREAKDOWN_TRIGGERED",
  WARN_RISK_HIGH: "WARN_RISK_HIGH",
  WARN_LOW_CONFIDENCE: "WARN_LOW_CONFIDENCE",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────

export type StageId =
  | "market_context"
  | "structure"
  | "momentum"
  | "volume"
  | "trigger"
  | "risk";

export type StageState = "completed" | "current" | "pending" | "failed";

export interface StageInfo {
  readonly id: StageId;
  readonly state: StageState;
}

export interface SetupStageProgress {
  /** Ordered stages with computed states. Always length 6. */
  readonly stages: readonly StageInfo[];
  /** Index of the current (active) stage. -1 if none. */
  readonly currentStageIndex: number;
  /** Every stage completed — setup is executable. */
  readonly allCompleted: boolean;
  /** At least one stage failed — pipeline stopped. */
  readonly hasFailed: boolean;
  /** At least one stage is still in progress. */
  readonly hasPending: boolean;
  /** Direction when allCompleted. */
  readonly direction: "long" | "short" | null;
  /** Final status label key. */
  readonly finalStatusKey: string;
}

// ─── Stage definitions ────────────────────────────────────────────────────

interface StageDef {
  id: StageId;
  /** Codes that mean this stage succeeded. */
  successCodes: readonly string[];
  /** Codes that mean this stage failed. */
  failCodes: readonly string[];
}

const STAGE_ORDER: readonly StageDef[] = [
  {
    id: "market_context",
    successCodes: [STAGE_CODES.MARKET_CONTEXT_HEALTHY, STAGE_CODES.MARKET_DATA_VALIDATED],
    failCodes: [STAGE_CODES.NOT_TRADEABLE, STAGE_CODES.PIPELINE_STOPPED],
  },
  {
    id: "structure",
    successCodes: [STAGE_CODES.TREND_CONFIRMED],
    failCodes: [STAGE_CODES.TREND_NOT_CONFIRMED],
  },
  {
    id: "momentum",
    successCodes: [STAGE_CODES.MOMENTUM_EXPANSION, STAGE_CODES.MOMENTUM_BUILDING],
    failCodes: [],
  },
  {
    id: "volume",
    successCodes: [STAGE_CODES.VOLUME_EXPANSION, STAGE_CODES.VOLUME_AVERAGE],
    failCodes: [],
  },
  {
    id: "trigger",
    successCodes: [STAGE_CODES.BREAKOUT, STAGE_CODES.BREAKDOWN],
    failCodes: [],
  },
  {
    id: "risk",
    successCodes: [], // risk is always completed if we reach it
    failCodes: [],
  },
];

// ─── Public API ───────────────────────────────────────────────────────────

/** Compute stage progress from an AnalysisSnapshot. */
export function computeStagesFromSnapshot(snapshot: AnalysisSnapshot): SetupStageProgress {
  const reasonSet = new Set(snapshot.opportunity.reasons ?? []);
  const warningSet = new Set(snapshot.opportunity.warnings ?? []);

  // Also check codes that may appear with ": detail" suffix
  const allReasonCodes = new Set<string>();
  for (const r of snapshot.opportunity.reasons ?? []) {
    const colonIdx = r.indexOf(": ");
    allReasonCodes.add(colonIdx > 0 ? r.substring(0, colonIdx) : r);
  }

  const stages: StageInfo[] = [];
  let currentStageIndex = -1;
  let foundCurrent = false;
  let foundFailed = false;

  for (const def of STAGE_ORDER) {
    // Check failure
    const hasFailed = def.failCodes.some((c) => allReasonCodes.has(c));
    // Check success (only if not failed)
    const hasSuccess = !hasFailed && def.successCodes.some((c) => allReasonCodes.has(c));

    let state: StageState;
    if (hasFailed) {
      state = "failed";
      foundFailed = true;
    } else if (hasSuccess) {
      state = "completed";
    } else if (!foundCurrent && !foundFailed) {
      state = "current";
      currentStageIndex = stages.length;
      foundCurrent = true;
    } else {
      state = "pending";
    }

    stages.push({ id: def.id, state });
  }

  const allCompleted = stages.every((s) => s.state === "completed");
  const hasFailedAny = stages.some((s) => s.state === "failed");
  const hasPending = stages.some((s) => s.state === "pending");

  // Determine direction
  let direction: "long" | "short" | null = null;
  if (allCompleted) {
    direction = snapshot.tradeSetup.direction ?? null;
    if (!direction) {
      const sig = snapshot.opportunity.signal;
      if (sig === "buy" || sig === "strong_buy") direction = "long";
      else if (sig === "sell" || sig === "strong_sell") direction = "short";
    }
  }

  // Final status key
  let finalStatusKey: string;
  if (allCompleted) {
    finalStatusKey = direction === "long" ? "setup_progress.final.ready_long" : "setup_progress.final.ready_short";
  } else if (hasFailedAny) {
    finalStatusKey = "setup_progress.final.no_trade";
  } else {
    finalStatusKey = "setup_progress.final.watch";
  }

  return {
    stages,
    currentStageIndex,
    allCompleted,
    hasFailed: hasFailedAny,
    hasPending,
    direction,
    finalStatusKey,
  };
}

/** Lightweight version: accept pre-extracted reason codes + direction. */
export function computeStagesFromCodes(
  reasonCodes: readonly string[],
  direction: "long" | "short" | null,
  recommendation: string,
): SetupStageProgress {
  const allReasonCodes = new Set<string>();
  for (const r of reasonCodes) {
    const colonIdx = r.indexOf(": ");
    allReasonCodes.add(colonIdx > 0 ? r.substring(0, colonIdx) : r);
  }

  const stages: StageInfo[] = [];
  let currentStageIndex = -1;
  let foundCurrent = false;
  let foundFailed = false;

  for (const def of STAGE_ORDER) {
    const hasFailed = def.failCodes.some((c) => allReasonCodes.has(c));
    const hasSuccess = !hasFailed && def.successCodes.some((c) => allReasonCodes.has(c));

    let state: StageState;
    if (hasFailed) {
      state = "failed";
      foundFailed = true;
    } else if (hasSuccess) {
      state = "completed";
    } else if (!foundCurrent && !foundFailed) {
      state = "current";
      currentStageIndex = stages.length;
      foundCurrent = true;
    } else {
      state = "pending";
    }

    stages.push({ id: def.id, state });
  }

  const allCompleted = stages.every((s) => s.state === "completed");
  const hasFailedAny = stages.some((s) => s.state === "failed");
  const hasPending = stages.some((s) => s.state === "pending");

  let finalDirection: "long" | "short" | null = direction;
  let finalStatusKey: string;
  if (allCompleted) {
    finalStatusKey = finalDirection === "long"
      ? "setup_progress.final.ready_long"
      : "setup_progress.final.ready_short";
  } else if (hasFailedAny) {
    finalStatusKey = "setup_progress.final.no_trade";
  } else {
    finalStatusKey = "setup_progress.final.watch";
  }

  return {
    stages, currentStageIndex, allCompleted,
    hasFailed: hasFailedAny, hasPending,
    direction: finalDirection, finalStatusKey,
  };
}

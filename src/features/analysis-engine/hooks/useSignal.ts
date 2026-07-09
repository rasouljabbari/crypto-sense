// ---------------------------------------------------------------------------
// useSignal — generates trading signal from ScoreEngineOutput
// ---------------------------------------------------------------------------

"use client";

import { useQuery } from "@tanstack/react-query";
import { generateTradingSignal } from "../services";
import type { ScoreEngineOutput } from "../services/scoring";
import type { TradingSignalOutput } from "../services/signaling";

export function useSignal(scores: ScoreEngineOutput | undefined) {
  return useQuery<TradingSignalOutput>({
    queryKey: signalKeys.detail(
      scores?.overall ?? 50,
      scores?.confidence ?? 0,
      scores?.risk ?? 50,
    ),
    queryFn: () => generateTradingSignal(scores!),
    enabled: !!scores,
    staleTime: Infinity,
  });
}

export const signalKeys = {
  all: ["signal"] as const,
  detail: (overall: number, confidence: number, risk: number) =>
    ["signal", overall, confidence, risk] as const,
};

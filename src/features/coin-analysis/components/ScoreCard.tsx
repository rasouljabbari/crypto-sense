"use client";

import { ScoreRing } from "@/components/ScoreRing";
import { SignalBadge } from "@/components/SignalBadge";
import type { TradingSignalType } from "@/features/analysis-engine/services/signaling";

interface ScoreCardProps {
  readonly overall: number;
  readonly signal: TradingSignalType;
  readonly confidence: number;
  readonly overallLabel: string;
  readonly signalLabel: string;
  readonly confidenceLabel: string;
}

export function ScoreCard({
  overall,
  signal,
  confidence,
  overallLabel,
  signalLabel,
  confidenceLabel,
}: ScoreCardProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-100">{overallLabel}</h3>
      </div>

      <div className="flex flex-col items-center gap-5">
        <ScoreRing value={overall} size={120} strokeWidth={8} />

        <div className="w-full space-y-3">
          {/* Signal */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{signalLabel}</span>
            <SignalBadge signal={signal} />
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500">{confidenceLabel}</span>
              <span className="text-xs font-medium text-cyan-400 tabular-nums">{confidence}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, Math.max(0, confidence))}%`,
                  background: "linear-gradient(90deg, #22d3ee, #06b6d4)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

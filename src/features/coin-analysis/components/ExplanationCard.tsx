"use client";

import type { ExplanationData } from "@/features/analysis-engine/services/explanation";

interface ExplanationCardProps {
  readonly data: ExplanationData | null;
  readonly titleLabel: string;
  readonly strengthsLabel: string;
  readonly weaknessesLabel: string;
  readonly risksLabel: string;
  readonly opportunitiesLabel: string;
  readonly recommendationLabel: string;
}

export function ExplanationCard({
  data,
  titleLabel,
  strengthsLabel,
  weaknessesLabel,
  risksLabel,
  opportunitiesLabel,
  recommendationLabel,
}: ExplanationCardProps) {
  if (!data) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-100">{titleLabel}</h3>
      </div>

      <div className="space-y-5">
        {/* Summary */}
        <p className="text-sm text-gray-300 leading-relaxed">{data.summary}</p>

        {/* Strengths & Weaknesses */}
        {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.strengths.length > 0 && (
              <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1.5">
                  {strengthsLabel}
                </p>
                <ul className="space-y-1">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-300 leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.weaknesses.length > 0 && (
              <div className="bg-red-900/10 border border-red-500/10 rounded-xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70 mb-1.5">
                  {weaknessesLabel}
                </p>
                <ul className="space-y-1">
                  {data.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-gray-300 leading-relaxed">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Risks & Opportunities */}
        {(data.risks.length > 0 || data.opportunities.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.risks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {risksLabel}
                </p>
                <ul className="space-y-1.5">
                  {data.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-red-400/60 mt-1.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.opportunities.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {opportunitiesLabel}
                </p>
                <ul className="space-y-1.5">
                  {data.opportunities.map((opp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="w-1 h-1 rounded-full bg-emerald-400/60 mt-1.5 shrink-0" />
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recommendation */}
        {data.recommendation && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              {recommendationLabel}
            </p>
            <p className="text-sm font-medium text-gray-200">{data.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import type { IndicatorItem } from "../types";

interface IndicatorsCardProps {
  readonly items: readonly IndicatorItem[];
  readonly titleLabel: string;
}

const STATUS_CLASSES: Record<IndicatorItem["status"], string> = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-gray-400",
  warning: "text-yellow-400",
};

export function IndicatorsCard({ items, titleLabel }: IndicatorsCardProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-8 4 4 4-6" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-100">{titleLabel}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-2.5 border-b border-gray-800/30 last:border-0"
          >
            <span className="text-xs text-gray-500">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-gray-200">
                {item.value}
              </span>
              <span className={`text-[10px] font-medium ${STATUS_CLASSES[item.status]}`}>
                {item.statusLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
